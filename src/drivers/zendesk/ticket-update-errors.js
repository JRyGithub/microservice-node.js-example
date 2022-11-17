const errors = [
  { status: 422, name: 'RecordInvalid' },
  { status: 409, name: 'Database collision' }
];

module.exports = (errorObject) => {
  if (!errorObject.statusCode) {
    return false;
  }

  return !!errors.find(({ status }) => status === errorObject.statusCode);
};
