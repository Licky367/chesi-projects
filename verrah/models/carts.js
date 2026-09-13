const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity cannot be less than 1.'],
      default: 1,
    },

    price: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    // Logged-in user's cart.
    // A user can have only one cart.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      unique: true,
      sparse: true,
    },

    // Used for carts belonging to visitors who are not logged in.
    // Once the visitor logs in, the cart can be associated with the user.
    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================================
// INDEXES
// ==========================================================

// One cart per logged-in user.
// `sparse: true` on the user field allows multiple guest
// carts where user is null.
cartSchema.index(
  { user: 1 },
  {
    unique: true,
    sparse: true,
  }
);

cartSchema.index({ sessionId: 1 });


// ==========================================================
// CALCULATE TOTAL PRICE BEFORE SAVING
// ==========================================================

cartSchema.pre('save', function (next) {
  this.totalPrice = this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  next();
});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;