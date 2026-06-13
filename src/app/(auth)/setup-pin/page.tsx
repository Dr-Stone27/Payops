"use client";

import { useState } from "react";
import { setupPin } from "@/actions/auth";

export default function SetupPinPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await setupPin(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set your approval PIN</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your 4-digit PIN is required to approve payments. Keep it private.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4-digit PIN</label>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
              <input
                name="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Setting PIN…" : "Set PIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
