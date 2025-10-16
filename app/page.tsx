"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome to <span className="text-primary">AI Chat Platform</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A minimal, intelligent chat experience — inspired by Claude’s clarity
          and design. Connect, create, and explore with your AI companion.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <button className="px-6 py-3 bg-black text-white rounded-2xl text-lg shadow-sm hover:shadow-md transition">
              Log In
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="px-6 py-3 border border-gray-400 rounded-2xl text-lg hover:bg-gray-200 transition">
              Sign Up
            </button>
          </Link>

        </div>
      </motion.div>

      <footer className="absolute bottom-4 text-sm text-gray-500">
        © {new Date().getFullYear()} Multi-Project AI Chat Platform
      </footer>
    </main>
  );
}
