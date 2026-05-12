import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, LogOut, ArrowLeft, ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Admin() {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!isAdmin) { navigate('/admin/login'); return null; }

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Panel de Administración</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'products' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          >
            Categorías
          </button>
        </div>

        {activeTab === 'products' ? <ProductsManager /> : <CategoriesManager />}
      </div>
    </div>
  );
}

function CategoriesManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('categories').update({ name }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ name });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada');
      resetForm();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoría eliminada');
    },
  });

  const resetForm = () => { setName(''); setEditingId(null); setOpen(false); };

  const startEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id);
    setName(cat.name);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-semibold">Categorías</h2>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </span>
                ) : 'Guardar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
            <span className="font-medium">{cat.name}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-muted-foreground text-center py-8">No hay categorías</p>}
      </div>
    </div>
  );
}

// Estados del proceso de guardado
type SaveStep = 'idle' | 'optimizing' | 'uploading' | 'saving' | 'done';

const stepMessages: Record<SaveStep, string> = {
  idle: 'Guardar',
  optimizing: 'Optimizando imagen...',
  uploading: 'Subiendo imagen...',
  saving: 'Guardando producto...',
  done: 'Guardado',
};

function ProductsManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saveStep, setSaveStep] = useState<SaveStep>('idle');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const optimizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('No se pudo optimizar la imagen'));
          },
          'image/webp',
          0.8
        );
      };

      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = url;
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    setSaveStep('optimizing');
    const optimizedBlob = await optimizeImage(file);

    setSaveStep('uploading');
    const fileName = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, optimizedBlob, { contentType: 'image/webp' });
    if (error) throw error;

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url = existingImageUrl;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      setSaveStep('saving');
      const productData = {
        name,
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId || null,
        image_url,
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setSaveStep('done');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
      setTimeout(() => { resetForm(); }, 300);
    },
    onError: () => {
      setSaveStep('idle');
      toast.error('Error al guardar el producto');
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setCategoryId('');
    setImageFile(null); setImagePreview(null); setExistingImageUrl(null);
    setEditingId(null); setSaveStep('idle'); setOpen(false);
  };

  const startEdit = (p: typeof products[0]) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(String(p.price));
    setCategoryId(p.category_id || '');
    setExistingImageUrl(p.image_url);
    setImageFile(null);
    setImagePreview(null);
    setSaveStep('idle');
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const isBusy = saveMutation.isPending;
  const previewSrc = imagePreview || existingImageUrl;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-semibold">Productos</h2>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={isBusy} />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={isBusy} />
              </div>
              <div>
                <Label>Precio</Label>
                <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required disabled={isBusy} />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={isBusy}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Imagen</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleImageChange}
                  disabled={isBusy}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: JPG, PNG, WEBP · Se optimizará automáticamente a WEBP
                </p>

                {/* Preview de imagen */}
                {previewSrc && (
                  <div className="mt-2 relative w-24 h-24">
                    <img
                      src={previewSrc}
                      alt="Preview"
                      className="h-24 w-24 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}

                {/* Indicador de progreso */}
                {isBusy && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                      <span>{stepMessages[saveStep]}</span>
                    </div>
                    {/* Barra de progreso */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width:
                            saveStep === 'optimizing' ? '33%' :
                            saveStep === 'uploading' ? '66%' :
                            saveStep === 'saving' ? '90%' :
                            saveStep === 'done' ? '100%' : '0%'
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                      <span className={saveStep === 'optimizing' ? 'text-primary font-medium' : ''}>Optimizar</span>
                      <span className={saveStep === 'uploading' ? 'text-primary font-medium' : ''}>Subir</span>
                      <span className={saveStep === 'saving' ? 'text-primary font-medium' : ''}>Guardar</span>
                    </div>
                  </div>
                )}

                {/* Si no hay imagen */}
                {!previewSrc && !isBusy && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>Sin imagen seleccionada</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isBusy}>
                {isBusy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {stepMessages[saveStep]}
                  </span>
                ) : 'Guardar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 bg-card rounded-lg border border-border p-3">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-sm text-muted-foreground">${p.price} MXN · {p.categories?.name || 'Sin categoría'}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-muted-foreground text-center py-8">No hay productos</p>}
      </div>
    </div>
  );
}
