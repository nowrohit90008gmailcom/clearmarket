import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  LineChart as LineChartIcon, 
  Crown,
  Shield,
  Settings,
  Eye,
  FileText,
  Plus,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: '', content: '', excerpt: '', cover_image: '', tags: '', published: false
  });

  const fetchAdminData = async () => {
    try {
      const [usersRes, statsRes, blogsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }),
        axios.get(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }),
        axios.get(`${API}/admin/blogs`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setBlogs(blogsRes.data);
    } catch (e) {
      console.error('Admin fetch error:', e);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const updateUserPlan = async (userId, plan) => {
    try {
      await axios.put(`${API}/admin/user/${userId}/plan?plan=${plan}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(`Plan updated to ${plan}`);
      setUsers(users.map(u => u.user_id === userId ? { ...u, plan, analyses_used: 0 } : u));
    } catch (e) {
      toast.error('Failed to update plan');
    }
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      const blogData = {
        ...blogForm,
        tags: blogForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      if (editingBlog) {
        await axios.put(`${API}/admin/blogs/${editingBlog.id}`, blogData, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success('Blog updated');
      } else {
        await axios.post(`${API}/admin/blogs`, blogData, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success('Blog created');
      }
      setBlogDialogOpen(false);
      resetBlogForm();
      fetchAdminData();
    } catch (e) {
      toast.error('Failed to save blog');
    }
  };

  const deleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;
    try {
      await axios.delete(`${API}/admin/blogs/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Blog deleted');
      fetchAdminData();
    } catch (e) {
      toast.error('Failed to delete blog');
    }
  };

  const editBlog = (blog) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt,
      cover_image: blog.cover_image || '',
      tags: blog.tags?.join(', ') || '',
      published: blog.published
    });
    setBlogDialogOpen(true);
  };

  const resetBlogForm = () => {
    setEditingBlog(null);
    setBlogForm({ title: '', content: '', excerpt: '', cover_image: '', tags: '', published: false });
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
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users, analytics, blogs, and platform settings</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card data-testid="stat-users">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-2xl font-bold">{stats.total_users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-analyses">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <LineChartIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Analyses</p>
                  <p className="text-2xl font-bold">{stats.total_analyses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-visits-today">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{stats.analytics?.visits_today || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-visits-week">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{stats.analytics?.visits_week || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-blogs">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-rose-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Blogs</p>
                  <p className="text-2xl font-bold">{stats.total_blogs || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics">
          <TabsList className="mb-6">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="blogs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blogs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Visits Chart */}
              <Card data-testid="daily-visits-chart">
                <CardHeader>
                  <CardTitle>Daily Visits (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.analytics?.daily_visits || []}>
                        <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="visits" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Pages */}
              <Card data-testid="top-pages">
                <CardHeader>
                  <CardTitle>Top Pages This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(stats.analytics?.page_breakdown || []).map((page, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">{page._id}</span>
                        <Badge variant="secondary">{page.count} visits</Badge>
                      </div>
                    ))}
                    {(!stats.analytics?.page_breakdown || stats.analytics.page_breakdown.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No visit data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Plan Distribution */}
              <Card data-testid="plan-distribution">
                <CardHeader>
                  <CardTitle>User Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.plan_distribution || {}).map(([plan, count]) => (
                      <div key={plan} className="flex items-center justify-between">
                        <span className="capitalize font-medium">{plan}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600" 
                              style={{ width: `${((count || 0) / (stats.total_users || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card data-testid="users-table">
              <CardHeader>
                <CardTitle>All Users ({users.length})</CardTitle>
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
                              <Badge className={getPlanColor(user.plan)}>{user.plan || 'free'}</Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>
                            </td>
                            <td className="py-4 px-4 text-center font-mono">{user.analyses_used || 0}</td>
                            <td className="py-4 px-4 text-center">
                              {user.role !== 'admin' ? (
                                <Button variant="outline" size="sm" onClick={() => updateUserRole(user.user_id, 'admin')}>Make Admin</Button>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => updateUserRole(user.user_id, 'user')}>Remove Admin</Button>
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

          <TabsContent value="blogs">
            <Card data-testid="blogs-management">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Blog Posts</CardTitle>
                <Dialog open={blogDialogOpen} onOpenChange={(open) => { setBlogDialogOpen(open); if (!open) resetBlogForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="create-blog-btn">
                      <Plus className="w-4 h-4 mr-2" /> New Blog
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingBlog ? 'Edit Blog' : 'Create New Blog'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBlogSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={blogForm.title} onChange={(e) => setBlogForm({...blogForm, title: e.target.value})} placeholder="Blog title" required data-testid="blog-title-input" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="excerpt">Excerpt</Label>
                        <Input id="excerpt" value={blogForm.excerpt} onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})} placeholder="Short description" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" value={blogForm.content} onChange={(e) => setBlogForm({...blogForm, content: e.target.value})} placeholder="Write your blog content..." rows={10} required data-testid="blog-content-input" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cover_image">Cover Image URL</Label>
                        <Input id="cover_image" value={blogForm.cover_image} onChange={(e) => setBlogForm({...blogForm, cover_image: e.target.value})} placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input id="tags" value={blogForm.tags} onChange={(e) => setBlogForm({...blogForm, tags: e.target.value})} placeholder="investing, stocks, tips" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="published" checked={blogForm.published} onCheckedChange={(checked) => setBlogForm({...blogForm, published: checked})} />
                        <Label htmlFor="published">Publish immediately</Label>
                      </div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="blog-submit-btn">
                        {editingBlog ? 'Update Blog' : 'Create Blog'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {blogs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No blogs yet. Create your first blog post!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blogs.map((blog) => (
                      <div key={blog.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50" data-testid={`blog-item-${blog.id}`}>
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{blog.title}</h3>
                            <Badge variant={blog.published ? 'default' : 'secondary'}>{blog.published ? 'Published' : 'Draft'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{blog.excerpt}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(blog.created_at).toLocaleDateString('en-IN')}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {blog.views || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => editBlog(blog)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30" onClick={() => deleteBlog(blog.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
