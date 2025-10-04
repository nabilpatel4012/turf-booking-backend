import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";
import { AppDataSource } from "../db/data.source";

export enum AuthRole {
  USER = "user",
  ADMIN = "admin",
}

interface TokenPayload {
  id: string;
  role: AuthRole;
}

export class AuthService {
  private userRepository: Repository<User>;
  private adminRepository: Repository<Admin>;
  private readonly jwtSecret: string;
  private readonly bcryptRounds: number;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.adminRepository = AppDataSource.getRepository(Admin);
    this.jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    this.bcryptRounds = 10;
  }

  // User Registration
  async registerUser(
    email: string,
    password: string,
    name: string,
    phone?: string
  ) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    await this.userRepository.save(user);

    const token = this.generateToken(user.id, AuthRole.USER);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: AuthRole.USER,
      },
    };
  }

  // User Login
  async loginUser(email: string, password: string) {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.email = :email", { email })
      .addSelect("user.password")
      .getOne();

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user.id, AuthRole.USER);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: AuthRole.USER,
      },
    };
  }

  // Admin Registration
  async registerAdmin(
    email: string,
    password: string,
    name: string,
    phone?: string
  ) {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new Error("Admin already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const admin = this.adminRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    await this.adminRepository.save(admin);

    const token = this.generateToken(admin.id, AuthRole.ADMIN);

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        role: AuthRole.ADMIN,
      },
    };
  }

  // Admin Login
  async loginAdmin(email: string, password: string) {
    const admin = await this.adminRepository
      .createQueryBuilder("admin")
      .where("admin.email = :email", { email })
      .addSelect("admin.password")
      .getOne();

    if (!admin) {
      throw new Error("Invalid credentials");
    }

    if (!admin.isActive) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(admin.id, AuthRole.ADMIN);

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        role: AuthRole.ADMIN,
      },
    };
  }

  private generateToken(id: string, role: AuthRole): string {
    return jwt.sign({ id, role }, this.jwtSecret, {
      expiresIn: "7d",
    });
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  // User Password Change
  async changeUserPassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.id = :userId", { userId })
      .addSelect("user.password")
      .getOne();

    if (!user) {
      throw new Error("User not found");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.password = hashedPassword;

    await this.userRepository.save(user);

    return { message: "Password changed successfully" };
  }

  // Admin Password Change
  async changeAdminPassword(
    adminId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const admin = await this.adminRepository
      .createQueryBuilder("admin")
      .where("admin.id = :adminId", { adminId })
      .addSelect("admin.password")
      .getOne();

    if (!admin) {
      throw new Error("Admin not found");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
    admin.password = hashedPassword;

    await this.adminRepository.save(admin);

    return { message: "Password changed successfully" };
  }

  // User Password Reset
  async resetUserPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    const result = await this.userRepository.update(
      { id: userId },
      { password: hashedPassword }
    );

    if (result.affected === 0) {
      throw new Error("User not found");
    }

    return { message: "Password reset successfully" };
  }

  // Admin Password Reset
  async resetAdminPassword(adminId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    const result = await this.adminRepository.update(
      { id: adminId },
      { password: hashedPassword }
    );

    if (result.affected === 0) {
      throw new Error("Admin not found");
    }

    return { message: "Password reset successfully" };
  }
}
