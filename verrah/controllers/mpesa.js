const {
  handleTransactionResult,
  handleTransactionTimeout
} =
  require("../services/mpesaTransactionService");

exports.transactionResult =
  async (req, res) => {
    try {
      await handleTransactionResult(
        req.body
      );
    } catch (err) {
      console.error(
        "M-Pesa Transaction Status result:",
        err
      );
    }

    return res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  };

exports.transactionTimeout =
  async (req, res) => {
    try {
      await handleTransactionTimeout(
        req.body
      );
    } catch (err) {
      console.error(
        "M-Pesa Transaction Status timeout:",
        err
      );
    }

    return res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  };
