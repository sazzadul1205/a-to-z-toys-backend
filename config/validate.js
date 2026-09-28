export async function validateAndBuild(Model, data) {
  const doc = new Model(data);
  try {
    await doc.validate();
    return {
      valid: true,
      doc: doc.toObject({ versionKey: false, virtuals: false }),
    };
  } catch (err) {
    const errors = {};
    for (const [field, e] of Object.entries(err.errors || {})) {
      errors[field] = e.message;
    }
    return { valid: false, errors };
  }
}