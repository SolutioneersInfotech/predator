import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    authId: string;
}

const UserSchema = new Schema<IUser>(
    {
        firstName: { type: String, default: "" },
        lastName: { type: String, default: "" },
        email: { type: String, required: true, unique: true },
        authId: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
