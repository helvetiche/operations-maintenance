import { createApiHandler, createSuccessResponse, createErrorResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getFirestoreAdmin } from "@/lib/firestore-admin";
import { NextRequest } from "next/server";
import { z } from "zod";
import "@/lib/init-security";
import { Employee } from "@/types";

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().or(z.literal("")),
  position: z.string().min(1).max(200),
});

// GET: List all employees (shared across all users)
const handleGet = async (request: NextRequest) => {
  try {
    await requireAuth(request); // Still require authentication
    const db = getFirestoreAdmin();
    
    // Get pagination parameters from URL
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "6");
    const page = parseInt(url.searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    // Query employees - if orderBy fails due to missing index, try without orderBy
    let docs;
    let totalCount = 0;
    
    try {
      // Get total count first (no userId filter - data is shared)
      const countSnapshot = await db
        .collection("employees")
        .get();
      totalCount = countSnapshot.size;
      
      // Get paginated results (no userId filter - data is shared)
      const employeesSnapshot = await db
        .collection("employees")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .offset(offset)
        .get();
      docs = employeesSnapshot.docs;
    } catch (orderByError) {
      const firebaseError = orderByError as { code?: string; message?: string };
      // If orderBy fails (likely missing index), try without it and sort manually
      if (firebaseError?.code === "failed-precondition" || firebaseError?.message?.includes("index")) {
        const employeesSnapshot = await db
          .collection("employees")
          .get();
        
        totalCount = employeesSnapshot.size;
        
        // Sort manually in memory
        const sortedDocs = employeesSnapshot.docs.sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toDate?.()?.getTime() || 
                       (aData.createdAt instanceof Date ? aData.createdAt.getTime() : 0);
          const bTime = bData.createdAt?.toDate?.()?.getTime() || 
                       (bData.createdAt instanceof Date ? bData.createdAt.getTime() : 0);
          return bTime - aTime; // Descending
        });
        
        // Apply pagination manually
        docs = sortedDocs.slice(offset, offset + limit);
      } else {
        throw orderByError;
      }
    }

    const employees: Employee[] = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        email: data.email,
        position: data.position,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return createSuccessResponse({ 
      employees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error; // Let createApiHandler handle auth errors
    }
    
    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching employees:", error);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a Firestore index error
    if (errorMessage.includes("index") || errorMessage.includes("indexes")) {
      return createErrorResponse(
        "Database index required",
        "Please create a Firestore index for employees collection. Check server logs for details."
      );
    }
    
    return createErrorResponse(
      "Failed to fetch employees",
      errorMessage.includes("Failed to fetch employees") 
        ? errorMessage 
        : "Unable to retrieve employees. Please try again."
    );
  }
};

// POST: Create new employee
const handlePost = async (request: NextRequest, validatedData: unknown) => {
  try {
    const user = await requireAuth(request);
    const data = validatedData as z.infer<typeof createEmployeeSchema>;
    const db = getFirestoreAdmin();

    const now = new Date();
    const employeeData = {
      userId: user.uid,
      name: data.name,
      email: data.email,
      position: data.position,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("employees").add(employeeData);

    const employee: Employee = {
      id: docRef.id,
      ...employeeData,
      createdAt: employeeData.createdAt.toISOString(),
      updatedAt: employeeData.updatedAt.toISOString(),
    };

    return createSuccessResponse({ employee });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationError") {
      throw error; // Let createApiHandler handle auth errors
    }
    return createErrorResponse(
      "Failed to create employee",
      "Unable to create employee. Please try again."
    );
  }
};

export const GET = createApiHandler(handleGet, {
  allowedMethods: ["GET"],
  requireCsrf: false, // GET requests don't need CSRF
});

export const POST = createApiHandler(handlePost, {
  schema: createEmployeeSchema,
  allowedMethods: ["POST"],
  requireCsrf: true,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
});
