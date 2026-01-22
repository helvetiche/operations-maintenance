import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import "@/lib/init-security";
import { Employee } from "@/types";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  position: z.string().min(1).max(200).optional(),
});

// GET: Get single employee (no ownership check - data is shared)
const handleGet = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const employeeId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("employees").doc(employeeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Employee not found", "The requested employee does not exist."),
        { status: 404 }
      );
    }

    const data = doc.data()!;

    const employee: Employee = {
      id: doc.id,
      userId: data.userId,
      name: data.name,
      email: data.email,
      position: data.position,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };

    return createSuccessResponse({ employee });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to fetch employee",
      "Unable to retrieve employee. Please try again."
    );
  }
};

// PUT: Update employee (no ownership check - data is shared)
const handlePut = async (
  request: NextRequest,
  validatedData: unknown
) => {
  try {
    await requireAuth(request); // Still require authentication
    const data = validatedData as z.infer<typeof updateEmployeeSchema>;
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const employeeId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("employees").doc(employeeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Employee not found", "The requested employee does not exist."),
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data()!;

    const employee: Employee = {
      id: updatedDoc.id,
      userId: updatedData.userId,
      name: updatedData.name,
      email: updatedData.email,
      position: updatedData.position,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || updatedData.createdAt,
      updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() || updatedData.updatedAt,
    };

    return createSuccessResponse({ employee });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to update employee",
      "Unable to update employee. Please try again."
    );
  }
};

// DELETE: Delete employee (no ownership check - data is shared)
const handleDelete = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    const url = new URL(request.url);
    const employeeId = url.pathname.split("/").pop() || "";

    const docRef = db.collection("employees").doc(employeeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        createErrorResponse("Employee not found", "The requested employee does not exist."),
        { status: 404 }
      );
    }

    await docRef.delete();

    return createSuccessResponse({ message: "Employee deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error;
    }
    return createErrorResponse(
      "Failed to delete employee",
      "Unable to delete employee. Please try again."
    );
  }
};

export const GET = createApiHandler(handleGet, {
  allowedMethods: ["GET"],
  requireCsrf: false,
});

export const PUT = createApiHandler(handlePut, {
  schema: updateEmployeeSchema,
  allowedMethods: ["PUT"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
});

export const DELETE = createApiHandler(handleDelete, {
  allowedMethods: ["DELETE"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
});
