"use client";

import { User, Briefcase, Gear } from "phosphor-react";

export const EmployeeListSkeleton = () => {
  // Create array of 6 skeleton rows to match the actual table
  const skeletonRows = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <>
      {/* Mobile Skeleton */}
      <div className="lg:hidden space-y-4">
        {skeletonRows.map((i) => (
          <div key={i} className="bg-gray-50 border border-emerald-900/20 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-900/20 rounded-full w-12 h-12 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-emerald-900/20 w-32 rounded mb-2"></div>
                <div className="h-3 bg-emerald-900/20 w-40 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-emerald-900/10 rounded"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 bg-emerald-900/20 w-24 rounded"></div>
              <div className="h-3 bg-emerald-900/20 w-16 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Skeleton */}
      <div className="hidden lg:block bg-gray-50 border border-emerald-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-emerald-900 border-b border-emerald-900/20">
                <th className="px-6 py-4 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <User size={16} weight="light" />
                    <span>Name</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center justify-center gap-2">
                    <Briefcase size={16} weight="light" />
                    <span>Assignments</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} weight="light" />
                    <span>Position</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-sm font-light text-gray-50">
                  <div className="flex items-center justify-end gap-2">
                    <Gear size={16} weight="light" />
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((i) => (
                <tr key={i} className="animate-pulse border-b border-emerald-900/10">
                  <td className="px-6 py-4 border-r border-emerald-900/10 h-16">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="bg-emerald-900/20 rounded-full w-10 h-10"></div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-50 rounded-full border-2 border-emerald-900"></div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-4 bg-emerald-900/20 w-32 rounded"></div>
                        <div className="h-3 bg-emerald-900/20 w-40 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-emerald-900/10">
                    <div className="flex items-center justify-center">
                      <div className="h-4 bg-emerald-900/20 w-6 rounded"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-emerald-900/10">
                    <div className="h-4 bg-emerald-900/20 w-40 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-9 h-9 bg-emerald-900/10 rounded"></div>
                      <div className="w-9 h-9 bg-emerald-900/10 rounded"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
