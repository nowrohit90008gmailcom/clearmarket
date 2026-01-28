import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  LineChart, 
  Crown,
  Shield,
  Settings
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          axios.get(`${API}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }),
          axios.get(`${API}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          })
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      } catch (e) {
        console.error('Admin fetch error:', e);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [token]);

  const updateUserRole = async (userId, role) => {
    try {
      await axios.put(`${API}/admin/user/${userId}/role?role=${role}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('User role updated');
      setUsers(users.map(u => u.user_id === userId ? { ...u, role } : u));
    } catch (e) {
      toast.error('Failed to update role');
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'premium': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'pro': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'basic': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="admin-page">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage users, plans, and platform settings
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-users">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-analyses">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Analyses</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_analyses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-free">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Free Users</p>
                  <p className="text-2xl font-bold text-foreground">{stats.plan_distribution?.free || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-paid">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Users</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(stats.plan_distribution?.basic || 0) + 
                     (stats.plan_distribution?.pro || 0) + 
                     (stats.plan_distribution?.premium || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card data-testid="users-table">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Analyses</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.user_id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                  {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <span className="font-bold text-emerald-600">{user.name?.charAt(0) || 'U'}</span>
                                  )}
                                </div>
                                <span className="font-medium text-foreground">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">{user.email}</td>
                            <td className="py-4 px-4 text-center">
                              <Badge className={getPlanColor(user.plan)}>
                                {user.plan || 'free'}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center font-mono">{user.analyses_used || 0}</td>
                            <td className="py-4 px-4 text-center">
                              {user.role !== 'admin' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateUserRole(user.user_id, 'admin')}
                                >
                                  Make Admin
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => updateUserRole(user.user_id, 'user')}
                                >
                                  Remove Admin
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-muted">
                    <h3 className="font-semibold mb-2">Feature Toggles</h3>
                    <p className="text-sm text-muted-foreground">
                      Feature toggle management will be available in the next version.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <h3 className="font-semibold mb-2">SEO Content</h3>
                    <p className="text-sm text-muted-foreground">
                      SEO content management will be available in the next version.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
