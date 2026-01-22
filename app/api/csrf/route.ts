import { generateCsrfTokenResponse } from "@/lib/api";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  return generateCsrfTokenResponse(request);
};
