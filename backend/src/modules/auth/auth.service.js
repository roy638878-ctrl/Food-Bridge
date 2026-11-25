import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { runTransaction } from "../../config/db.js";
import { AppError } from "../../middlewares/errorHandler.js";

function issueToken(user) {
  return jwt.sign({ userId: user.user_id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function getProfileByUser(db, user) {
  let profile = null;
  if (user.role === "donor") {
    profile = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(user.user_id);
  } else if (user.role === "ngo" || user.role === "receiver") {
    profile = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(user.user_id);
  }
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    account_status: user.account_status,
    profile,
  };
}

export function registerUser(db, data) {
  const existing = db.prepare("SELECT user_id FROM users WHERE email = ?").get(data.email);
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = bcrypt.hashSync(data.password, 10);

  const createdUser = runTransaction(db, () => {
    const userInsert = db
      .prepare(
        `INSERT INTO users (full_name, email, phone, password_hash, role, account_status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      )
      .run(data.full_name, data.email, data.phone, passwordHash, data.role);

    const userId = Number(userInsert.lastInsertRowid);

    if (data.role === "donor") {
      db.prepare(
        `INSERT INTO donors (user_id, donor_type, organization_name, address, city, verification_status)
         VALUES (?, ?, ?, ?, ?, 'verified')`
      ).run(
        userId,
        data.donor_type || "individual",
        data.organization_name || data.full_name,
        data.address,
        data.city
      );
    } else {
      const orgName = data.ngo_name || data.organization_name || data.full_name;
      const regNo = data.registration_number || null;
      if (regNo) {
        const dupReg = db
          .prepare("SELECT ngo_id FROM ngos WHERE registration_number = ?")
          .get(regNo);
        if (dupReg) {
          throw new AppError("An NGO with this registration number already exists.", 409);
        }
      }
      db.prepare(
        `INSERT INTO ngos (user_id, ngo_name, registration_number, address, city, service_area, daily_capacity_servings, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
      ).run(
        userId,
        orgName,
        regNo,
        data.address,
        data.city,
        data.service_area || data.city,
        data.daily_capacity_servings || 50
      );
    }

    return db
      .prepare("SELECT user_id, full_name, email, phone, role, account_status FROM users WHERE user_id = ?")
      .get(userId);
  });

  return {
    token: issueToken(createdUser),
    user: getProfileByUser(db, createdUser),
  };
}

export function loginUser(db, { email, password }) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError("Invalid email or password.", 401);
  }
  if (user.account_status === "suspended") {
    throw new AppError("Account suspended. Please contact administrator.", 403);
  }

  return {
    token: issueToken(user),
    user: getProfileByUser(db, user),
  };
}
