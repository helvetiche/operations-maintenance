import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import { Schedule, Employee, TaskCompletion } from "@/types";

let adminFirestore: Firestore | undefined;

/**
 * Get Firestore Admin instance
 * SERVER-SIDE ONLY - Do not import in client components
 * Only use in API route handlers (app/api/ directory)
 */
export const getFirestoreAdmin = (): Firestore => {
  if (adminFirestore) {
    return adminFirestore;
  }

  const adminApp = getAdminApp();
  adminFirestore = getFirestore(adminApp);

  return adminFirestore;
};

/**
 * Get all schedules (shared across all users)
 */
export const getSchedules = async (): Promise<Schedule[]> => {
  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection("schedules")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      reminderDate: data.reminderDate,
      personAssigned: data.personAssigned,
      personEmail: data.personEmail,
      status: data.status || "active",
      hideFromCalendar: data.hideFromCalendar || false,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Schedule;
  });
};

/**
 * Get all employees (shared across all users)
 */
export const getEmployees = async (): Promise<Employee[]> => {
  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection("employees")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      name: data.name,
      email: data.email || "",
      position: data.position,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Employee;
  });
};

/**
 * Get all completions (shared across all users)
 */
export const getCompletions = async (): Promise<TaskCompletion[]> => {
  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection("completions")
    .orderBy("completedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      scheduleId: data.scheduleId,
      userId: data.userId,
      completedAt: data.completedAt,
      completedBy: data.completedBy,
      completedByName: data.completedByName,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      deadlineType: data.deadlineType,
      notes: data.notes,
    } as TaskCompletion;
  });
};
