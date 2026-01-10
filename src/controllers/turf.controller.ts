import { Response } from "express";
import { TurfService } from "../services/turf.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { TurfStatus } from "../entities/turf.entity";
import { AuthRole } from "../services/auth.service"; // Import AuthRole

export class TurfController {
  private turfService: TurfService;

  constructor() {
    this.turfService = new TurfService();
  }

  // Get all turfs (accessible by users, restricted for admins)
  getAllTurfs = async (req: AuthRequest, res: Response) => {
    const { status, city, state } = req.query;

    const filters: any = {
      status: status as TurfStatus,
      city: city as string,
      state: state as string,
    };

    // SMART FILTERING: If logged in as ADMIN, restrict to their own turfs
    if (req.user && req.user.role === AuthRole.ADMIN) {
      // Use service method that filters by ID
      const turfs = await this.turfService.getTurfsByOwnerId(req.user.id);
      
      return res.json({
        success: true,
        count: turfs.length,
        data: turfs,
      });
    }

    const turfs = await this.turfService.getAllTurfs(filters);

    res.json({
      success: true,
      count: turfs.length,
      data: turfs,
    });
  };

  getAllTurfsV2 = async (req: AuthRequest, res: Response) => {
    // SMART FILTERING: If logged in as ADMIN, restrict to their own turfs
    if (req.user && req.user.role === AuthRole.ADMIN) {
       req.query.ownerId = req.user.id;
    }

    const turfs = await this.turfService.getAllTurfsV2(req.query);

    res.json({
      success: true,
      count: turfs.length,
      data: turfs,
    });
  };

  // Get turf by ID (accessible by users)
  getTurfById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const turf = await this.turfService.getTurfById(id);

    res.json({
      success: true,
      data: turf,
    });
  };

  // Get turfs owned by logged-in admin
  getMyTurfs = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const turfs = await this.turfService.getTurfsByOwnerId(adminId);

    res.json({
      success: true,
      count: turfs.length,
      data: turfs,
    });
  };

  // Get single turf for admin (Verifies ownership)
  getTurfByIdForAdmin = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Reuse getTurfById but verified ownership
    // Ideally service should have getTurfByIdForOwner, but we can fetch and check
    const turf = await this.turfService.getTurfById(id, true); // true = include inactive

    if (turf.ownerId !== adminId) {
       return res.status(403).json({ error: "You don't have permission to view this turf" });
    }

    res.json({
      success: true,
      data: turf,
    });
  };

  // Create new turf (admin only)
  createTurf = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      googleMapUrl,
      latitude,
      longitude,
      phone,
      logo, // Added logo
      images,
      amenities,
      openingTime,
      closingTime,
      venueType,
      shape,
      size,
    } = req.body;

    const turf = await this.turfService.createTurf(adminId, {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      googleMapUrl,
      latitude,
      longitude,
      phone,
      logo, // Added logo
      images,
      amenities,
      openingTime,
      closingTime,
      venueType,
      shape,
      size,
    });

    res.status(201).json({
      success: true,
      message: "Turf created successfully",
      data: turf,
    });
  };

  // Update turf (admin only - must be owner)
  updateTurf = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      googleMapUrl,
      latitude,
      longitude,
      phone,
      logo, // Added logo
      images,
      amenities,
      status,
      openingTime,
      closingTime,
      venueType,
      shape,
      size,
    } = req.body;

    const turf = await this.turfService.updateTurf(id, adminId, {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      googleMapUrl,
      latitude,
      longitude,
      phone,
      logo, // Added logo
      images,
      amenities,
      status,
      openingTime,
      closingTime,
      venueType,
      shape,
      size,
    });

    res.json({
      success: true,
      message: "Turf updated successfully",
      data: turf,
    });
  };

  // Delete turf (soft delete - admin only)
  deleteTurf = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await this.turfService.deleteTurf(id, adminId);

    res.json({
      success: true,
      ...result,
    });
  };

  // Hard delete turf (permanent delete - admin only)
  hardDeleteTurf = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await this.turfService.hardDeleteTurf(id, adminId);

    res.json({
      success: true,
      ...result,
    });
  };

  // Update turf status (admin only)
  updateTurfStatus = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const turf = await this.turfService.updateTurfStatus(id, adminId, status);

    res.json({
      success: true,
      message: "Turf status updated successfully",
      data: turf,
    });
  };

}
