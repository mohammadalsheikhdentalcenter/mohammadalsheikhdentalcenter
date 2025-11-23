"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast"

export function SignupForm() {
  const [selectedRole, setSelectedRole] = useState("receptionist");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "receptionist",
    phone: "",
    specialty: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return false;
    }

    if (formData.username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }

    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character"
      );
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    if (formData.phone && formData.phone.length < 10) {
      toast.error("Phone number must be at least 10 digits");
      return false;
    }

    if (selectedRole === "doctor" && !formData.specialty.trim()) {
      toast.error("Specialty is required for doctors");
      return false;
    }

    return true;
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await signup(formData);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      let errorMessage = "Signup failed";

      // If your backend returns a response with JSON
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      // If it's a standard Error object
      else if (err instanceof Error) {
        errorMessage = err.message;
      }

      // ✅ Detect duplicate user error and show a clear message
      if (
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("duplicate") ||
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("username")
      ) {
        toast.error("User with this email or username already exists");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleDescriptions = {
    doctor: "View assigned patients and clinical tools",
    receptionist: "Manage patients, appointments, and billing",
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
            Create Account
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Join DentalCare Pro today
          </p>
        </div>

        <div className="mb-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-amber-900">
              Admin Access
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Admin accounts are pre-configured. Contact your system
              administrator for admin credentials.
            </p>
          </div>
        </div>

        {/* Role Selection Tabs */}
        <div className="mb-8">
          <label className="block text-xs sm:text-sm font-semibold text-foreground mb-3">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {["doctor", "receptionist"].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`py-2 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                  selectedRole === role
                    ? "bg-primary text-primary-foreground border-2 border-primary"
                    : "bg-muted text-muted-foreground border-2 border-border hover:border-primary/50"
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="username"
                required
              />
            </div>
          </div>

          {/* Full Name Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Min 8 chars, 1 uppercase, 1 number, 1 special char (@$!%*?&)
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Specialty Field (Doctor only) */}
          {selectedRole === "doctor" && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                Specialty
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                className="w-full px-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                placeholder="e.g., General Dentistry, Orthodontics"
              />
            </div>
          )}

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold py-2 sm:py-2.5 rounded-lg transition-colors duration-200 mt-6 text-sm sm:text-base cursor-pointer"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Sign In
          </a>
        </p>
      </div>

      {/* Footer */}
       <p className="text-center text-xs text-muted-foreground mt-6">© 2025 Dr.Mohammad Alsheikh Dental Center. All rights reserved.</p>
    </div>
  );
}
