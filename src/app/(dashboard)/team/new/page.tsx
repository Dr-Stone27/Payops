"use client";

import { useState } from "react";
import Link from "next/link";
import { inviteTeamMember } from "@/actions/auth";

export default function NewTeamMemberPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await inviteTeamMember(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <Link href="/team" className="text-sm text-gray-500 hover:text-gray-700">← Back to team</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Add team member</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          New members can log in immediately with these credentials.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <strong>Demo tip:</strong> Add a <strong>Maker</strong> to demonstrate the four-eyes rule — the Maker submits payment requests, and an Owner/Admin (Checker) approves them. The same person cannot do both.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              name="fullName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Amaka Osei"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="amaka@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select role</option>
              <option value="maker">Maker — creates payment requests, cannot approve</option>
              <option value="admin">Admin (Checker) — approves payment requests, cannot create own</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Checkers are Admin and Owner roles. Makers can only create, not approve.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Adding member…" : "Add team member"}
          </button>
        </form>
      </div>
    </div>
  );
}
