import bcrypt from "bcryptjs";

const password = process.env.HASH_PASSWORD;
if (!password) throw new Error("Set HASH_PASSWORD before running this local utility");
const hashedPassword = bcrypt.hashSync(password, 10);
console.log(hashedPassword);
