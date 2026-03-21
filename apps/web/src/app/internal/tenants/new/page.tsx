/**
 * Internal Admin - Create New Tenant Page
 * Wizard-style form: Tenant → Branch → Super Owner
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  User,
  Check,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminStore } from '@/stores/admin-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Step = 'tenant' | 'branch' | 'owner' | 'complete';

interface TenantData {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  subscriptionPlan: string;
  trialDays: number;
  logoUrl: string;
}

interface LogoState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

interface BranchData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
}

interface OwnerData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface CreatedEntities {
  tenant: { id: string; name: string; slug: string } | null;
  branch: { id: string; name: string } | null;
  owner: { id: string; name: string; email: string } | null;
}

export default function NewTenantPage() {
  const router = useRouter();
  const { accessToken } = useAdminStore();
  const [step, setStep] = useState<Step>('tenant');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logo, setLogo] = useState<LogoState>({
    file: null,
    preview: null,
    uploading: false,
  });

  const [created, setCreated] = useState<CreatedEntities>({
    tenant: null,
    branch: null,
    owner: null,
  });

  const [tenantData, setTenantData] = useState<TenantData>({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    subscriptionPlan: 'trial',
    trialDays: 14,
    logoUrl: '',
  });

  const [branchData, setBranchData] = useState<BranchData>({
    name: 'Main Branch',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
  });

  const [ownerData, setOwnerData] = useState<OwnerData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const apiCall = async (endpoint: string, body: object) => {
    const response = await fetch(`${API_URL}/internal${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data;
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
      setLogo({
        file,
        preview: e.target?.result as string,
        uploading: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogo({ file: null, preview: null, uploading: false });
    setTenantData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (tenantId: string): Promise<string | null> => {
    if (!logo.file) return null;

    setLogo((prev) => ({ ...prev, uploading: true }));

    try {
      const formData = new FormData();
      formData.append('file', logo.file, logo.file.name);
      formData.append('tenantId', tenantId);

      const response = await fetch(`${API_URL}/internal/upload/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return data.data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
      return null;
    } finally {
      setLogo((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleCreateTenant = async () => {
    if (!tenantData.name || !tenantData.email) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Create tenant first (without logo)
      const tenant = await apiCall('/tenants', {
        name: tenantData.name,
        legalName: tenantData.legalName || undefined,
        email: tenantData.email,
        phone: tenantData.phone || undefined,
        subscriptionPlan: tenantData.subscriptionPlan,
        trialDays: tenantData.trialDays,
      });

      // Step 2: Upload logo with actual tenantId
      let logoUrl: string | null = null;
      if (logo.file) {
        logoUrl = await uploadLogo(tenant.id);

        // Step 3: Update tenant with logo URL
        if (logoUrl) {
          await fetch(`${API_URL}/internal/tenants/${tenant.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ logoUrl }),
          });
        }
      }

      setCreated((prev) => ({ ...prev, tenant }));
      setBranchData((prev) => ({ ...prev, email: tenantData.email }));
      setStep('branch');
      toast.success('Tenant created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchData.name || !created.tenant) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      const branch = await apiCall('/branches', {
        tenantId: created.tenant.id,
        name: branchData.name,
        address: branchData.address || undefined,
        city: branchData.city || undefined,
        state: branchData.state || undefined,
        pincode: branchData.pincode || undefined,
        phone: branchData.phone || undefined,
        email: branchData.email || undefined,
        gstin: branchData.gstin || undefined,
      });

      setCreated((prev) => ({ ...prev, branch }));
      setOwnerData((prev) => ({ ...prev, email: tenantData.email }));
      setStep('owner');
      toast.success('Branch created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOwner = async () => {
    if (!ownerData.name || !ownerData.email || !ownerData.phone || !ownerData.password) {
      toast.error('Please fill in all required fields');
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

    if (!created.tenant || !created.branch) {
      toast.error('Missing tenant or branch');
      return;
    }

    setIsLoading(true);
    try {
      const owner = await apiCall('/users', {
        tenantId: created.tenant.id,
        branchId: created.branch.id,
        name: ownerData.name,
        email: ownerData.email,
        phone: ownerData.phone,
        password: ownerData.password,
      });

      setCreated((prev) => ({ ...prev, owner }));
      setStep('complete');
      toast.success('Super owner created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create owner');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 'tenant', label: 'Tenant', icon: Building2 },
    { id: 'branch', label: 'Branch', icon: MapPin },
    { id: 'owner', label: 'Owner', icon: User },
    { id: 'complete', label: 'Done', icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

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
        <h1 className="text-2xl font-bold text-slate-900">Create New Tenant</h1>
        <p className="text-slate-500">Set up a new salon business with branch and owner</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isComplete = index < currentStepIndex;

          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isComplete
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : isActive
                      ? 'border-amber-500 text-amber-500'
                      : 'border-slate-300 text-slate-400'
                }`}
              >
                {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}
              >
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-4 ${isComplete ? 'bg-amber-500' : 'bg-slate-200'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Cards */}
      <div className="max-w-2xl mx-auto">
        {/* Step 1: Tenant */}
        {step === 'tenant' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Business Information</CardTitle>
              <CardDescription className="text-slate-500">
                Enter the salon business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-slate-700">Business Logo</Label>
                <div className="flex items-start gap-4">
                  <div
                    className={`relative w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${
                      logo.preview
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-300 bg-slate-50 hover:border-slate-400 cursor-pointer'
                    }`}
                    onClick={() => !logo.preview && fileInputRef.current?.click()}
                  >
                    {logo.preview ? (
                      <>
                        <img
                          src={logo.preview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLogoRemove();
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-slate-400 mx-auto" />
                        <span className="text-xs text-slate-500 mt-1">No logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-slate-300"
                      disabled={logo.uploading}
                    >
                      {logo.uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {logo.preview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">JPEG, PNG, WebP, or SVG. Max 2MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={tenantData.name}
                    onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                    placeholder="Glamour Studio"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Legal Name</Label>
                  <Input
                    value={tenantData.legalName}
                    onChange={(e) => setTenantData({ ...tenantData, legalName: e.target.value })}
                    placeholder="Glamour Studio Pvt Ltd"
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={tenantData.email}
                    onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                    placeholder="contact@glamourstudio.com"
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
                      value={tenantData.phone}
                      onChange={(e) =>
                        setTenantData({
                          ...tenantData,
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
                  <Label className="text-slate-700">Subscription Plan</Label>
                  <Select
                    value={tenantData.subscriptionPlan}
                    onValueChange={(value) =>
                      setTenantData({ ...tenantData, subscriptionPlan: value })
                    }
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
                {tenantData.subscriptionPlan === 'trial' && (
                  <div className="space-y-2">
                    <Label className="text-slate-700">Trial Days</Label>
                    <Input
                      type="number"
                      value={tenantData.trialDays || ''}
                      onChange={(e) =>
                        setTenantData({
                          ...tenantData,
                          trialDays: e.target.value ? parseInt(e.target.value) : 0,
                        })
                      }
                      onBlur={(e) => {
                        if (!e.target.value || parseInt(e.target.value) <= 0) {
                          setTenantData({ ...tenantData, trialDays: 14 });
                        }
                      }}
                      min={1}
                      max={90}
                      className="border-slate-300"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateTenant}
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Create & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Branch */}
        {step === 'branch' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Branch Information</CardTitle>
              <CardDescription className="text-slate-500">
                Set up the first branch for {created.tenant?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Branch Name <span className="text-red-500">*</span>
                  </Label>
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
                  placeholder="123 Main Street, Shop No. 5"
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
                    placeholder="branch@glamourstudio.com"
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateBranch}
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Create & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Owner */}
        {step === 'owner' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Super Owner Account</CardTitle>
              <CardDescription className="text-slate-500">
                Create the admin user for {created.tenant?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={ownerData.name}
                  onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                  placeholder="John Doe"
                  className="border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={ownerData.email}
                    onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                    placeholder="owner@glamourstudio.com"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Phone <span className="text-red-500">*</span>
                  </Label>
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
                  <Label className="text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={ownerData.password}
                    onChange={(e) => setOwnerData({ ...ownerData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={ownerData.confirmPassword}
                    onChange={(e) =>
                      setOwnerData({ ...ownerData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm password"
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateOwner}
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Create Owner & Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-green-100 rounded-full">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Tenant Created Successfully!
              </h2>
              <p className="text-slate-500 mb-8">
                The salon business has been set up and is ready to use.
              </p>

              <div className="bg-slate-50 rounded-lg p-4 mb-8 text-left max-w-md mx-auto border border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Login Credentials</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-900 font-mono">{created.owner?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Password:</span>
                    <span className="text-slate-900 font-mono">{ownerData.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Login URL:</span>
                    <span className="text-amber-600 font-mono">/login</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/internal/tenants')}
                  className="border-slate-300"
                >
                  View All Tenants
                </Button>
                <Button
                  onClick={() => {
                    setStep('tenant');
                    setCreated({ tenant: null, branch: null, owner: null });
                    setLogo({ file: null, preview: null, uploading: false });
                    setTenantData({
                      name: '',
                      legalName: '',
                      email: '',
                      phone: '',
                      subscriptionPlan: 'trial',
                      trialDays: 14,
                      logoUrl: '',
                    });
                    setBranchData({
                      name: 'Main Branch',
                      address: '',
                      city: '',
                      state: '',
                      pincode: '',
                      phone: '',
                      email: '',
                      gstin: '',
                    });
                    setOwnerData({
                      name: '',
                      email: '',
                      phone: '',
                      password: '',
                      confirmPassword: '',
                    });
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                >
                  Create Another Tenant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
