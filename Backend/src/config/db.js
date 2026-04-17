import mongoose from 'mongoose';

export const connectDB = async ()=>{
    try {
        await mongoose.connect(
            process.env.MONGODB_CONNECTIONSTRING
        );
        console.log("Ket noi DB thanh cong");
    } catch (error) {
        console.error("Loi khi ket noi DB", error);
        process.exit(1); // exit whit error
    }
}