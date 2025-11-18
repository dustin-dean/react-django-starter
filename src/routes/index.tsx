import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="container mx-auto p-8">
      <h1 className="font-black text-6xl mb-8">Home</h1>
      
      {isAuthenticated ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Welcome, {user?.username}!</h2>
            <p className="text-gray-600">Email: {user?.email}</p>
            <p className="text-sm text-gray-500 mt-2">
              You are logged in using session-based authentication.
            </p>
          </div>
          
          <button
            onClick={async () => {
              await logout();
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">You are not logged in.</p>
          <Link
            to="/login"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}
