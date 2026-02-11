import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, FileText, Activity, RefreshCcw, Trash2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ page_views: [] });
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blogForm, setBlogForm] = useState({
    title: '', content: '', excerpt: '', cover_image: '', tags: '', published: false,
  });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, blogsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, authHeaders),
        axios.get(`${API}/admin/stats`, authHeaders),
        axios.get(`${API}/admin/blogs`, authHeaders),
      ]);
      setUsers(usersRes.data || []);
      setStats(statsRes.data || { page_views: [] });
      setBlogs(blogsRes.data || []);
    } catch (e) {
      console.error('Admin fetch error:', e);
      toast.error(e?.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createBlog = async (e) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      await axios.post(`${API}/admin/blogs`, {
        ...blogForm,
        tags: blogForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      }, authHeaders);
      toast.success('Blog post created');
      setBlogForm({ title: '', content: '', excerpt: '', cover_image: '', tags: '', published: false });
      fetchAdminData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create blog');
    }
  };

  const deleteBlog = async (blogId) => {
    try {
      await axios.delete(`${API}/admin/blogs/${blogId}`, authHeaders);
      toast.success('Blog deleted');
      fetchAdminData();
    } catch (e) {
      toast.error('Failed to delete blog');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="admin-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Admin Panel
          </h1>
          <Button variant="outline" onClick={fetchAdminData}><RefreshCcw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.users || 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Analyses</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.analyses || 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Blogs</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.blogs || 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Visits</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.visits || 0}</CardContent></Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="blogs"><FileText className="w-4 h-4 mr-2" />Blogs</TabsTrigger>
            <TabsTrigger value="traffic"><Activity className="w-4 h-4 mr-2" />Traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>Users</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {users.length === 0 ? <p className="text-muted-foreground">No users yet.</p> : users.map((u) => (
                  <div key={u.user_id} className="border rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.name || 'User'} ({u.email})</p>
                      <p className="text-sm text-muted-foreground">Role: {u.role || 'user'} · Plan: {u.plan || 'free'}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blogs" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Create Blog</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={createBlog} className="space-y-3">
                  <div><Label>Title</Label><Input value={blogForm.title} onChange={(e) => setBlogForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>Excerpt</Label><Input value={blogForm.excerpt} onChange={(e) => setBlogForm((p) => ({ ...p, excerpt: e.target.value }))} /></div>
                  <div><Label>Cover Image URL</Label><Input value={blogForm.cover_image} onChange={(e) => setBlogForm((p) => ({ ...p, cover_image: e.target.value }))} /></div>
                  <div><Label>Tags (comma separated)</Label><Input value={blogForm.tags} onChange={(e) => setBlogForm((p) => ({ ...p, tags: e.target.value }))} /></div>
                  <div><Label>Content</Label><Textarea rows={8} value={blogForm.content} onChange={(e) => setBlogForm((p) => ({ ...p, content: e.target.value }))} /></div>
                  <div className="flex items-center gap-2"><Switch checked={blogForm.published} onCheckedChange={(checked) => setBlogForm((p) => ({ ...p, published: checked }))} /><span>Publish immediately</span></div>
                  <Button type="submit">Save Blog</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Existing Blogs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {blogs.length === 0 ? <p className="text-muted-foreground">No blog posts yet.</p> : blogs.map((blog) => (
                  <div key={blog.id} className="border rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{blog.title}</p>
                      <p className="text-sm text-muted-foreground">{blog.published ? 'Published' : 'Draft'} · {blog.views || 0} views</p>
                    </div>
                    <Button variant="ghost" onClick={() => deleteBlog(blog.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic">
            <Card>
              <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(stats.page_views || []).length === 0 ? <p className="text-muted-foreground">No traffic data yet.</p> : stats.page_views.map((row) => (
                  <div key={row.page} className="flex items-center justify-between border-b py-2">
                    <span>{row.page}</span>
                    <span className="font-semibold">{row.visits}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
