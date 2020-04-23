const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Double = require('@mongoosejs/double');
const Long = mongoose.Schema.Types.Long;

const DetectionSchema = new mongoose.Schema({
  label: String,
  model: String,
  stream: String,
  confidence: Double,
  starts: Long,
  ends: Long,
  created: { type: Date, default: Date.now() }
});

const Detection = mongoose.model('Detection', DetectionSchema);

module.exports = {
  DetectionSchema,
  Detection
}
