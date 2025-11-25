import mongoose from "mongoose";

const deltaProductSchema = new mongoose.Schema({
    symbol: { type: String, required: true, unique: true },
    product_id: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("DeltaProduct", deltaProductSchema);