var timeUtils = require("../misc/time");
const moment = require("moment-timezone");

module.exports = class Conversion {
  constructor(src, property, target = null){
    this.src = src;

    if(target == null){
      target = src;
    }
    this.target = target;
    this.property = property;

    this.value = null;
    this.conversions = [];
    this.required = true;
    this.default = null;
  }

  execute(){
    if(this.required && this.src[this.property] == null) {
      this.throwError(`the parameter is required but was not provided`);
    }

    this.value = this.src[this.property] || this.default;


    for (var executeValidation of this.conversions){
      executeValidation();
    }

    this.target[this.property] = this.value;
  }

  optional(def){
    this.required = false;
    this.default = def;

    return this;
  }

  throwError(message){
    throw new Error(`Parameter ${this.property}: ${message}`);
  }

  toFloat() {
    this.conversions.push(() => {
      let newValue = parseFloat(this.value);
      if (isNaN(newValue)){
        this.throwError(`${this.value} should be a float but it is not`);
      }
      this.value = newValue;
    });

    return this;
  }

  minimum(a) {
    this.conversions.push(() => {
      if(this.value < a) {
        this.throwError(`${this.value} is smaller than the minimum ${a}`);
      }
    });

    return this;
  }

  maximum(b) {
    this.conversions.push(() => {
      if(this.value > b) {
        this.throwError(`${this.value} is larger than the max ${b}`);
      }
    });

    return this;
  }

  toLatitude() {
    this.toFloat();
    this.minimum(-90.0);
    this.maximum(90.0);

    return this;
  }

  toLongitude() {
    this.toFloat();
    this.minimum(-180.0);
    this.maximum(180.0);

    return this;
  }

  toMoment(tz="UTC") {
    this.conversions.push(() => {
      let newValue = moment.tz(this.value, tz);

      if (isNaN(newValue)) {
        this.throwError(`${this.value} should be a ISO8601 DateTime string but it is not`);
      }

      this.value = newValue;
    });
    return this;
  }

  toQuantumTime(){
    this.toMoment();
    this.conversions.push(() => {
      timeUtils.quantify(this.value);
    });
    return this;
  }

  toInt(){
    this.conversions.push(() => {
      let newValue = parseInt(this.value);

      if (isNaN(newValue)) {
        this.throwError(`${this.value} should be an integer but it is not`);
      }

      this.value = newValue;
    });
    return this;
  }

  toNonNegativeInt(){
    this.toInt();
    this.minimum(0);

    return this;
  }

  toString(){
    this.conversions.push(()=>{
      this.value = this.value.toString();
    });
  }
};