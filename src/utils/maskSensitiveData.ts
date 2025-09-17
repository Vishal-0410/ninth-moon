
export const maskSensitiveData = (
  obj: any,
  fields: string[] = ["password", "token", "authorization","confirmpassword","otp","temptoken","uid", "newpassword"]
) => {
  if (!obj || typeof obj !== "object") return obj;
  const clone = { ...obj };
  for (const key of Object.keys(clone)) {
    if (fields.includes(key.toLowerCase())) {
      clone[key] = "***REDACTED***";
    } else if (typeof clone[key] === "object") {
      clone[key] = maskSensitiveData(clone[key], fields);
    }
  }
  return clone;
};
