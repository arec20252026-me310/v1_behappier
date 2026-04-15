"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import type { Space } from "@/lib/types"
import { Spinner } from "@/components/ui/spinner"

interface SpaceSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSpaceCreated: (space: Space) => void
  existingSpace?: Space | null
}

const BUILDING_TYPES = [
  { value: 'office', label: 'Office Building' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'healthcare', label: 'Healthcare Facility' },
  { value: 'education', label: 'Educational Institution' },
  { value: 'hospitality', label: 'Hotel / Hospitality' },
  { value: 'industrial', label: 'Industrial / Warehouse' },
  { value: 'residential', label: 'Residential Building' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
]

export function SpaceSetupDialog({ open, onOpenChange, onSpaceCreated, existingSpace }: SpaceSetupDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: existingSpace?.name || '',
    description: existingSpace?.description || '',
    address: existingSpace?.address || '',
    building_type: existingSpace?.building_type || 'office',
    total_area_sqft: existingSpace?.total_area_sqft?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const spaceData = {
      name: formData.name,
      description: formData.description || null,
      address: formData.address || null,
      building_type: formData.building_type,
      total_area_sqft: formData.total_area_sqft ? parseInt(formData.total_area_sqft) : null,
    }

    if (existingSpace) {
      const { data, error } = await supabase
        .from('spaces')
        .update(spaceData)
        .eq('id', existingSpace.id)
        .select()
        .single()

      if (data && !error) {
        onSpaceCreated(data)
      }
    } else {
      const { data, error } = await supabase
        .from('spaces')
        .insert(spaceData)
        .select()
        .single()

      if (data && !error) {
        onSpaceCreated(data)
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingSpace ? 'Edit Space' : 'Set Up Your Space'}</DialogTitle>
          <DialogDescription>
            {existingSpace 
              ? 'Update your space configuration'
              : 'Tell us about the space you want to analyze. This helps our AI agents understand your environment.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Space Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Office Building"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="building_type">Building Type</Label>
            <Select
              value={formData.building_type}
              onValueChange={(value) => setFormData({ ...formData, building_type: value })}
            >
              <SelectTrigger id="building_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street, City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_area_sqft">Total Area (sq ft)</Label>
            <Input
              id="total_area_sqft"
              type="number"
              value={formData.total_area_sqft}
              onChange={(e) => setFormData({ ...formData, total_area_sqft: e.target.value })}
              placeholder="e.g., 10000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your space, its purpose, and what insights you&apos;re looking for..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {existingSpace && (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {existingSpace ? 'Save Changes' : 'Create Space'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
