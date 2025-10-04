import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../entities/user.entity";
import { AppDataSource } from "../db/data.source";

export class AuthService {
  private userRepository: Repository<User>;
  private readonly jwtSecret: string;
  private readonly bcryptRounds: number;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    this.bcryptRounds = 10;
  }

  async register(
    email: string,
    password: string,
    name: string,
    role: UserRole = UserRole.USER
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
      role,
    });

    await this.userRepository.save(user);

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
    // Use createQueryBuilder with addSelect to explicitly include password
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.email = :email", { email })
      .addSelect("user.password") // Explicitly select password field
      .getOne();

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateToken(user: User): string {
    return jwt.sign({ id: user.id, role: user.role }, this.jwtSecret, {
      expiresIn: "7d",
    });
  }

  verifyToken(token: string): { id: string; role: UserRole } {
    return jwt.verify(token, this.jwtSecret) as { id: string; role: UserRole };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    // Fetch user with password for verification
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.id = :userId", { userId })
      .addSelect("user.password")
      .getOne();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.password = hashedPassword;

    await this.userRepository.save(user);

    return { message: "Password changed successfully" };
  }

  async resetPassword(userId: string, newPassword: string) {
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update password directly without fetching
    const result = await this.userRepository.update(
      { id: userId },
      { password: hashedPassword }
    );

    if (result.affected === 0) {
      throw new Error("User not found");
    }

    return { message: "Password reset successfully" };
  }
}
