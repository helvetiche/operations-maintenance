"use client";

import { useState } from "react";
import { Employee } from "@/types";
import { Button } from "../ui/Button";

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: {
    name: string;
    email: string;
    position: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const EmployeeForm = ({
  employee,
  onSubmit,
  onCancel,
  loading = false,
}: EmployeeFormProps) => {
  const [name, setName] = useState(employee?.name || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [position, setPosition] = useState(employee?.position || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email is optional, but if provided, must be valid
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!position.trim()) {
      newErrors.position = "Position is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      position: position.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-regular text-emerald-900 mb-2">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-4 py-2 bg-gray-100 border ${
            errors.name ? "border-red-500" : "border-emerald-900/20"
          } rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900`}
          placeholder="e.g., John Doe"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-regular text-emerald-900 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full px-4 py-2 bg-gray-100 border ${
            errors.email ? "border-red-500" : "border-emerald-900/20"
          } rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900`}
          placeholder="e.g., john@example.com (optional)"
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-regular text-emerald-900 mb-2">
          Position <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className={`w-full px-4 py-2 bg-gray-100 border ${
            errors.position ? "border-red-500" : "border-emerald-900/20"
          } rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900`}
          placeholder="e.g., Software Engineer"
        />
        {errors.position && <p className="mt-1 text-xs text-red-500">{errors.position}</p>}
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="bg-emerald-900 hover:bg-emerald-800 text-gray-50"
        >
          {loading ? "Saving..." : employee ? "Update Employee" : "Create Employee"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-emerald-900 border border-emerald-900/20"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
