import mongoose from "mongoose";

const example = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
  _id: String,
  instructions: { type: String, default: "" },
  examples: { type: [example], default: [] },
}, { timestamps: true });

export default mongoose.model("InboxTraining", schema);
