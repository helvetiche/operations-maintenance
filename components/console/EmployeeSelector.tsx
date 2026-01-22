"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Employee } from "@/types";
import { useEmployees } from "@/hooks/useEmployees";
import { MagnifyingGlass, X } from "phosphor-react";

interface EmployeeSelectorProps {
  value?: { name: string; email: string };
  onChange: (employee: { name: string; email: string }) => void;
  error?: string;
}

export const EmployeeSelector = ({ value, onChange, error }: EmployeeSelectorProps) => {
  const { employees, loading } = useEmployees();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (employee: Employee) => {
    onChange({ name: employee.name, email: employee.email });
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ name: "", email: "" });
    setSearchQuery("");
    setIsOpen(false);
  };

  const displayValue = value?.name || "";

  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlass
          size={20}
          weight="light"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60"
        />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search employees..."
          className={`w-full pl-10 pr-10 py-2 bg-gray-100 border ${
            error ? "border-red-500" : "border-emerald-900/20"
          } rounded-md text-emerald-900 font-regular placeholder-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-900`}
        />
        {value?.name && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60 hover:text-emerald-900"
          >
            <X size={16} weight="light" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-50 border border-emerald-900/20 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-sm font-regular text-emerald-900/60">
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-4 text-center text-sm font-regular text-emerald-900/60">
              {searchQuery.trim() ? "No employees found" : "No employees available"}
            </div>
          ) : (
            <div className="py-1">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => handleSelect(employee)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center gap-3"
                >
                  <div className="bg-emerald-900 p-2 rounded-full flex-shrink-0 aspect-square w-10 h-10 flex items-center justify-center">
                    <span className="text-xs font-regular text-gray-50 uppercase">
                      {employee.name.charAt(0) || employee.email.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-regular text-emerald-900 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs font-regular font-mono text-emerald-900/60 truncate">
                      {employee.email}
                    </p>
                    <p className="text-xs font-regular text-emerald-900/60 truncate">
                      {employee.position}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
