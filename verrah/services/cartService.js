const mongoose = require('mongoose');
const Product = require('../models/products');
const Cart = require('../models/carts');
const { getUserId, getSessionId } = require('./shopContext');

async function getOrCreateCart(req, session = null) {
  const sessionId = getSessionId(req);
  if (!sessionId) throw new Error('A session or logged-in user is required.');

  let cart = await Cart.findOne({ sessionId }).session(session);
  if (!cart) {
    cart = new Cart({ sessionId, user: getUserId(req), items: [] });
    await cart.save({ session });
  } else if (!cart.user && getUserId(req)) {
    cart.user = getUserId(req);
    await cart.save({ session });
  }
  return cart;
}

async function addToCart(req, productId, requestedQty) {
  const qty = Number(requestedQty);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be a whole number greater than zero.');

  const dbSession = await mongoose.startSession();
  try {
    let result;
    await dbSession.withTransaction(async () => {
      // Do not consume physical stock at cart time. Reserve it instead.
      const product = await Product.findOneAndUpdate(
        {
          _id: productId,
          isActive: true,
          $expr: { $gte: [{ $subtract: ['$units', { $ifNull: ['$reservedUnits', 0] }] }, qty] }
        },
        { $inc: { reservedUnits: qty } },
        { new: true, session: dbSession }
      ).lean();

      if (!product) throw new Error('The requested quantity is not available.');

      const cart = await getOrCreateCart(req, dbSession);
      const existing = cart.items.find(item => String(item.productId) === String(product._id));
      if (existing) {
        existing.qty += qty;
        existing.name = product.name;
        existing.price = product.unitSellPrice;
        existing.image = product.image || '';
      } else {
        cart.items.push({
          product: product._id,
          productId: String(product._id),
          name: product.name,
          price: product.unitSellPrice,
          image: product.image || '',
          qty
        });
      }
      await cart.save({ session: dbSession });
      result = cart;
    });
    return result;
  } finally {
    await dbSession.endSession();
  }
}

async function getCart(req) {
  const sessionId = getSessionId(req);
  if (!sessionId) return null;
  return Cart.findOne({ sessionId }).populate('items.product').lean();
}

async function removeItem(req, productId) {
  const cart = await getCart(req);
  if (!cart) throw new Error('Cart not found.');
  const item = cart.items.find(i => String(i.productId) === String(productId));
  if (!item) throw new Error('Item is not in the cart.');

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const product = await Product.findById(productId).session(dbSession);
      if (product) {
        product.reservedUnits = Math.max(0, Number(product.reservedUnits || 0) - Number(item.qty || 0));
        await product.save({ session: dbSession });
      }
      await Cart.updateOne(
        { _id: cart._id },
        { $pull: { items: { productId: String(productId) } } },
        { session: dbSession }
      );
    });
  } finally {
    await dbSession.endSession();
  }
}

function calculateTotal(cart) {
  return (cart?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
}

module.exports = { getOrCreateCart, addToCart, getCart, removeItem, calculateTotal };
