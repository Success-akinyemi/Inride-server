import mongoose from 'mongoose';

const DriverLocationSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  name: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline'
  }
});

DriverLocationSchema.index({ location: '2dsphere' });


const DriverLocationModel = mongoose.model('DriverLocation', DriverLocationSchema);
export default DriverLocationModel
