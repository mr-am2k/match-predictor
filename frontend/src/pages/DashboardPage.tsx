import { TrendingUp, Calendar, Target, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { MyLeaguesOverview } from '../components/leagues/MyLeaguesOverview';

const stats = [
  { label: 'Total Predictions', value: '0', icon: Target, color: 'bg-blue-100 text-blue-600' },
  { label: 'Correct Predictions', value: '0', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  { label: 'Upcoming Matches', value: '0', icon: Calendar, color: 'bg-purple-100 text-purple-600' },
];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your prediction activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/leagues/new">
              <Button icon={<Plus className="w-4 h-4" />}>
                Create league
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} hover>
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* My Leagues */}
          <div className="lg:col-span-2">
            <MyLeaguesOverview />
          </div>

          {/* User Profile */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.username}</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Role</span>
                  <span className="font-medium text-gray-900 capitalize">{user?.role || 'User'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Member since</span>
                  <span className="font-medium text-gray-900">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
