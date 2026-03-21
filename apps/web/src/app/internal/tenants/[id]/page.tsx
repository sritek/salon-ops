/**
 * Internal Admin - Tenant Detail Page
 * With edit functionality and ability to add branches/owners
 */

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Edit,
  Plus,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminStore } from '@/stores/admin-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Owner {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  branches: Branch[];
  users: Owner[];
  _count: {
    branches: number;
    users: number;
  };
}

interface EditTenantData {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  logoUrl: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface BranchFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
}

interface OwnerFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { accessToken, logout } = useAdminStore();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Edit tenant state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editData, setEditData] = useState<EditTenantData>({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    logoUrl: '',
    subscriptionPlan: 'trial',
    subscriptionStatus: 'active',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add branch state
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [branchData, setBranchData] = useState<BranchFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
  });

  // Add owner state
  const [isOwnerOpen, setIsOwnerOpen] = useState(false);
  const [isOwnerLoading, setIsOwnerLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [ownerData, setOwnerData] = useState<OwnerFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchTenant = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/internal/tenants/${params.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          router.push('/internal/login');
          return;
        }
        throw new Error('Failed to fetch tenant');
      }

      const data = await response.json();
      setTenant(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch tenant');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, params.id, logout, router]);

  useEffect(() => {
    if (isHydrated && accessToken) {
      fetchTenant();
    }
  }, [isHydrated, accessToken, fetchTenant]);

  const openEditDialog = () => {
    if (tenant) {
      setEditData({
        name: tenant.name,
        legalName: tenant.legalName || '',
        email: tenant.email,
        phone: tenant.phone || '',
        logoUrl: tenant.logoUrl || '',
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
      });
      setLogoPreview(tenant.logoUrl);
      setLogoFile(null);
      setIsEditOpen(true);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and SVG images are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !tenant) return editData.logoUrl || null;

    try {
      const formData = new FormData();
      formData.append('file', logoFile, logoFile.name);
      formData.append('tenantId', tenant.id);

      const response = await fetch(`${API_URL}/internal/upload/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Upload failed');
      return data.data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
      return null;
    }
  };

  const handleUpdateTenant = async () => {
    if (!editData.name || !editData.email) {
      toast.error('Name and email are required');
      return;
    }

    setIsEditLoading(true);
    try {
      let logoUrl = editData.logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) logoUrl = uploadedUrl;
      }

      const response = await fetch(`${API_URL}/internal/tenants/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: editData.name,
          legalName: editData.legalName || null,
          email: editData.email,
          phone: editData.phone || null,
          logoUrl: logoUrl || null,
          subscriptionPlan: editData.subscriptionPlan,
          subscriptionStatus: editData.subscriptionStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Update failed');

      toast.success('Tenant updated successfully');
      setIsEditOpen(false);
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tenant');
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleAddBranch = async () => {
    if (!branchData.name) {
      toast.error('Branch name is required');
      return;
    }

    setIsBranchLoading(true);
    try {
      const response = await fetch(`${API_URL}/internal/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId: params.id,
          name: branchData.name,
          address: branchData.address || undefined,
          city: branchData.city || undefined,
          state: branchData.state || undefined,
          pincode: branchData.pincode || undefined,
          phone: branchData.phone || undefined,
          email: branchData.email || undefined,
          gstin: branchData.gstin || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create branch');

      toast.success('Branch created successfully');
      setIsBranchOpen(false);
      setBranchData({
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
      });
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      setIsBranchLoading(false);
    }
  };

  const handleAddOwner = async () => {
    if (!ownerData.name || !ownerData.email || !ownerData.phone || !ownerData.password) {
      toast.error('All fields are required');
      return;
    }
    if (ownerData.password !== ownerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (ownerData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!selectedBranchId) {
      toast.error('Please select a branch');
      return;
    }

    setIsOwnerLoading(true);
    try {
      const response = await fetch(`${API_URL}/internal/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId: params.id,
          branchId: selectedBranchId,
          name: ownerData.name,
          email: ownerData.email,
          phone: ownerData.phone,
          password: ownerData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create owner');

      toast.success('Super owner created successfully');
      setIsOwnerOpen(false);
      setOwnerData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setSelectedBranchId('');
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create owner');
    } finally {
      setIsOwnerLoading(false);
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'trial':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'basic':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'professional':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'enterprise':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-64 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-center py-12">
          <h2 className="text-xl text-slate-900 mb-4">Tenant not found</h2>
          <Button
            onClick={() => router.push('/internal/tenants')}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Back to Tenants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/internal/tenants')}
          className="text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>

        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
              <Badge className={getPlanBadgeColor(tenant.subscriptionPlan)}>
                {tenant.subscriptionPlan}
              </Badge>
            </div>
            <p className="text-slate-500">{tenant.slug}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Info */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              Business Details
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={openEditDialog}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.legalName && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Legal Name</p>
                <p className="text-slate-900">{tenant.legalName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase">Email</p>
              <p className="text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {tenant.email}
              </p>
            </div>
            {tenant.phone && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Phone</p>
                <p className="text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  +91 {tenant.phone}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase">Created</p>
              <p className="text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            {tenant.trialEndsAt && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Trial Ends</p>
                <p className="text-amber-600 font-medium">
                  {format(new Date(tenant.trialEndsAt), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-500" />
              Branches ({tenant._count.branches})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsBranchOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {tenant.branches.length === 0 ? (
              <p className="text-slate-500 text-sm">No branches yet. Add one to continue setup.</p>
            ) : (
              <div className="space-y-3">
                {tenant.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-900 font-medium">{branch.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          branch.isActive
                            ? 'border-green-300 text-green-700 bg-green-50'
                            : 'border-slate-300 text-slate-500 bg-slate-50'
                        }
                      >
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {(branch.city || branch.state) && (
                      <p className="text-sm text-slate-500">
                        {[branch.city, branch.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owners */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Super Owners
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsOwnerOpen(true)}
              disabled={tenant.branches.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {tenant.users.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {tenant.branches.length === 0
                  ? 'Add a branch first, then create an owner.'
                  : 'No owners yet. Add one to complete setup.'}
              </p>
            ) : (
              <div className="space-y-3">
                {tenant.users.map((user) => (
                  <div key={user.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-900 font-medium">{user.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? 'border-green-300 text-green-700 bg-green-50'
                            : 'border-slate-300 text-slate-500 bg-slate-50'
                        }
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-sm text-slate-500">+91 {user.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Edit Tenant</DialogTitle>
            <DialogDescription className="text-slate-500">
              Update tenant information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div
                className={`relative w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${
                  logoPreview
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-300 bg-slate-50 cursor-pointer hover:border-slate-400'
                }`}
                onClick={() => !logoPreview && fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoPreview(null);
                        setLogoFile(null);
                        setEditData({ ...editData, logoUrl: '' });
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-slate-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoPreview ? 'Change' : 'Upload'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Business Name *</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Legal Name</Label>
                <Input
                  value={editData.legalName}
                  onChange={(e) => setEditData({ ...editData, legalName: e.target.value })}
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Email *</Label>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Phone</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md text-slate-500 text-sm">
                    +91
                  </div>
                  <Input
                    value={editData.phone}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
                    }
                    className="border-slate-300 rounded-l-none"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Subscription Plan</Label>
                <Select
                  value={editData.subscriptionPlan}
                  onValueChange={(v) => setEditData({ ...editData, subscriptionPlan: v })}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Status</Label>
                <Select
                  value={editData.subscriptionStatus}
                  onValueChange={(v) => setEditData({ ...editData, subscriptionStatus: v })}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTenant}
                disabled={isEditLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isEditLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Branch Dialog */}
      <Dialog open={isBranchOpen} onOpenChange={setIsBranchOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Add Branch</DialogTitle>
            <DialogDescription className="text-slate-500">
              Create a new branch for {tenant.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Branch Name *</Label>
                <Input
                  value={branchData.name}
                  onChange={(e) => setBranchData({ ...branchData, name: e.target.value })}
                  placeholder="Main Branch"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">GSTIN</Label>
                <Input
                  value={branchData.gstin}
                  onChange={(e) => setBranchData({ ...branchData, gstin: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Address</Label>
              <Input
                value={branchData.address}
                onChange={(e) => setBranchData({ ...branchData, address: e.target.value })}
                placeholder="123 Main Street"
                className="border-slate-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">City</Label>
                <Input
                  value={branchData.city}
                  onChange={(e) => setBranchData({ ...branchData, city: e.target.value })}
                  placeholder="Mumbai"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">State</Label>
                <Input
                  value={branchData.state}
                  onChange={(e) => setBranchData({ ...branchData, state: e.target.value })}
                  placeholder="Maharashtra"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Pincode</Label>
                <Input
                  value={branchData.pincode}
                  onChange={(e) => setBranchData({ ...branchData, pincode: e.target.value })}
                  placeholder="400001"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Phone</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md text-slate-500 text-sm">
                    +91
                  </div>
                  <Input
                    value={branchData.phone}
                    onChange={(e) =>
                      setBranchData({
                        ...branchData,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
                    }
                    placeholder="9876543210"
                    className="border-slate-300 rounded-l-none"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Email</Label>
                <Input
                  type="email"
                  value={branchData.email}
                  onChange={(e) => setBranchData({ ...branchData, email: e.target.value })}
                  placeholder="branch@example.com"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBranchOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBranch}
                disabled={isBranchLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isBranchLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Branch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Owner Dialog */}
      <Dialog open={isOwnerOpen} onOpenChange={setIsOwnerOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Add Super Owner</DialogTitle>
            <DialogDescription className="text-slate-500">
              Create a super owner for {tenant.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Assign to Branch *</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {tenant.branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Full Name *</Label>
              <Input
                value={ownerData.name}
                onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                placeholder="John Doe"
                className="border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Email *</Label>
                <Input
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  placeholder="owner@example.com"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Phone *</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md text-slate-500 text-sm">
                    +91
                  </div>
                  <Input
                    value={ownerData.phone}
                    onChange={(e) =>
                      setOwnerData({
                        ...ownerData,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
                    }
                    placeholder="9876543210"
                    className="border-slate-300 rounded-l-none"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Password *</Label>
                <Input
                  type="password"
                  value={ownerData.password}
                  onChange={(e) => setOwnerData({ ...ownerData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Confirm Password *</Label>
                <Input
                  type="password"
                  value={ownerData.confirmPassword}
                  onChange={(e) => setOwnerData({ ...ownerData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOwnerOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddOwner}
                disabled={isOwnerLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isOwnerLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Owner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
