import mongoose from "mongoose";

const membershipPackageSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true // VD: "Gói Hội Viên 1 Tháng", "Gói VIP 1 Năm"
  },
  price: { 
    type: Number, 
    required: true // 50000 hoặc 500000
  },
  durationInMonths: { 
    type: Number, 
    required: true // 1 hoặc 12
  },
  description: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

const MembershipPackage = mongoose.model("MembershipPackage", membershipPackageSchema);
export default MembershipPackage;