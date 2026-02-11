import { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  Users, 
  LineChart as LineChartIcon, 
  Shield,
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

  const fetchAdminData = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // --- REST OF YOUR FILE REMAINS EXACTLY THE SAME ---

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="admin-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Shield className="w-8 h-8 text-emerald-600" />
          Admin Panel
        </h1>
        {/* Rest of JSX remains unchanged */}
      </main>
    </div>
  );
}
