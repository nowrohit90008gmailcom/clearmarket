import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2,
  LineChart,
  IndianRupee
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Portfolio() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState({ stocks: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '', quantity: '', buy_price: '' });

  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setPortfolio(response.data);
    } catch (e) {
      console.error('Error fetching portfolio:', e);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStock.symbol || !newStock.quantity || !newStock.buy_price) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await axios.post(`${API}/portfolio/add`, {
        symbol: newStock.symbol.toUpperCase(),
        quantity: parseFloat(newStock.quantity),
        buy_price: parseFloat(newStock.buy_price)
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Stock added to portfolio!');
      setNewStock({ symbol: '', quantity: '', buy_price: '' });
      setDialogOpen(false);
      fetchPortfolio();
    } catch (e) {
      toast.error('Failed to add stock');
    }
  };

  const handleRemoveStock = async (stockId) => {
    try {
      await axios.delete(`${API}/portfolio/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Stock removed from portfolio');
      fetchPortfolio();
    } catch (e) {
      toast.error('Failed to remove stock');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="portfolio-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* UI remains unchanged */}
      </main>
    </div>
  );
}
