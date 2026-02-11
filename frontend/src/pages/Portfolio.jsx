import { useState, useEffect, useCallback } from 'react';
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
import { Briefcase, Plus, Trash2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Portfolio() {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState({ stocks: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '', quantity: '', buy_price: '' });

  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
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
        buy_price: parseFloat(newStock.buy_price),
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success('Stock added to portfolio!');
      setNewStock({ symbol: '', quantity: '', buy_price: '' });
      setDialogOpen(false);
      fetchPortfolio();
    } catch {
      toast.error('Failed to add stock');
    }
  };

  const handleRemoveStock = async (stockId) => {
    try {
      await axios.delete(`${API}/portfolio/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success('Stock removed from portfolio');
      fetchPortfolio();
    } catch {
      toast.error('Failed to remove stock');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="portfolio-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-emerald-600" />
            My Portfolio
          </h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Stock</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Portfolio Stock</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStock} className="space-y-3">
                <div><Label>Symbol</Label><Input value={newStock.symbol} onChange={(e) => setNewStock((p) => ({ ...p, symbol: e.target.value }))} /></div>
                <div><Label>Quantity</Label><Input type="number" value={newStock.quantity} onChange={(e) => setNewStock((p) => ({ ...p, quantity: e.target.value }))} /></div>
                <div><Label>Buy Price</Label><Input type="number" value={newStock.buy_price} onChange={(e) => setNewStock((p) => ({ ...p, buy_price: e.target.value }))} /></div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card><CardHeader><CardTitle className="text-sm">Total Stocks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{portfolio.summary.total_stocks || 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Invested</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{portfolio.summary.invested || 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Current Value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{portfolio.summary.current_value || 0}</CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-muted-foreground">Loading portfolio...</p> : null}
            {!loading && portfolio.stocks.length === 0 ? <p className="text-muted-foreground">No holdings yet. Add your first stock.</p> : null}
            {portfolio.stocks.map((stock) => (
              <div key={stock.id} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{stock.symbol}</p>
                  <p className="text-sm text-muted-foreground">Qty {stock.quantity} · Avg ₹{stock.buy_price}</p>
                </div>
                <Button variant="ghost" onClick={() => handleRemoveStock(stock.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
