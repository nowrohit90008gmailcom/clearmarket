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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              My Portfolio
            </h1>
            <p className="text-muted-foreground">
              Track your stock holdings and performance
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-stock-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock to Portfolio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStock} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Stock Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., RELIANCE, TCS"
                    value={newStock.symbol}
                    onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
                    className="uppercase"
                    data-testid="add-symbol-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Number of shares"
                    value={newStock.quantity}
                    onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                    data-testid="add-quantity-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buy_price">Buy Price (₹)</Label>
                  <Input
                    id="buy_price"
                    type="number"
                    placeholder="Price per share"
                    value={newStock.buy_price}
                    onChange={(e) => setNewStock({ ...newStock, buy_price: e.target.value })}
                    data-testid="add-price-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="add-stock-submit">
                  Add to Portfolio
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="total-invested-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-foreground flex items-center">
                <IndianRupee className="w-5 h-5" />
                {portfolio.summary.total_invested?.toLocaleString('en-IN') || 0}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="current-value-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Current Value</p>
              <p className="text-2xl font-bold text-foreground flex items-center">
                <IndianRupee className="w-5 h-5" />
                {portfolio.summary.total_current_value?.toLocaleString('en-IN') || 0}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="total-pl-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
              <p className={`text-2xl font-bold flex items-center ${
                portfolio.summary.total_profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {portfolio.summary.total_profit_loss >= 0 ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
                ₹{Math.abs(portfolio.summary.total_profit_loss || 0).toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="pl-percent-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">P&L %</p>
              <p className={`text-2xl font-bold ${
                portfolio.summary.total_profit_loss_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {portfolio.summary.total_profit_loss_percent >= 0 ? '+' : ''}{portfolio.summary.total_profit_loss_percent || 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Stocks */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
          </div>
        ) : portfolio.stocks.length > 0 ? (
          <Card data-testid="portfolio-stocks">
            <CardHeader>
              <CardTitle>Your Holdings ({portfolio.summary.stock_count} stocks)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Stock</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Avg Buy</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Current Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Day Chg</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">P&L</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.stocks.map((stock) => (
                      <tr key={stock.id} className="border-b border-border/50 hover:bg-muted/50" data-testid={`portfolio-row-${stock.symbol}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              stock.profit_loss >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
                            }`}>
                              {stock.profit_loss >= 0 ? (
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-rose-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-mono font-bold text-foreground">{stock.symbol}</p>
                              <p className="text-sm text-muted-foreground">{stock.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono">{stock.quantity}</td>
                        <td className="py-4 px-4 text-right font-mono">₹{stock.buy_price?.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-4 text-right">
                          <p className="font-mono font-bold">₹{stock.current_price?.toLocaleString('en-IN')}</p>
                        </td>
                        <td className={`py-4 px-4 text-right font-mono text-sm ${
                          stock.day_change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {stock.day_change >= 0 ? '+' : ''}{stock.day_change}%
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className={`font-mono font-bold ${
                            stock.profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {stock.profit_loss >= 0 ? '+' : ''}₹{stock.profit_loss?.toLocaleString('en-IN')}
                          </p>
                          <p className={`text-xs ${
                            stock.profit_loss_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            ({stock.profit_loss_percent >= 0 ? '+' : ''}{stock.profit_loss_percent}%)
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/analyze/${stock.symbol}`)}
                            >
                              <LineChart className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                              onClick={() => handleRemoveStock(stock.id)}
                              data-testid={`remove-${stock.symbol}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                Your portfolio is empty
              </h3>
              <p className="text-muted-foreground mb-6">
                Start by adding stocks you own to track their performance
              </p>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Stock
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
