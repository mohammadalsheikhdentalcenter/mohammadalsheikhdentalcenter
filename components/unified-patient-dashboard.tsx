// components/unified-patient-dashboard.tsx
"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToothChart } from "@/components/tooth-chart"
import { MedicalHistorySection } from "@/components/medical-history-section"
import { PatientImagesSection } from "@/components/patient-images-section"
import { toast } from "react-hot-toast"
import { FileText, Image, Activity } from "lucide-react"

interface UnifiedPatientDashboardProps {
  patientId: string
  patientName: string
  patient: any
  token: string
  isDoctor: boolean
  currentDoctorId?: string
  onPatientUpdate?: () => void
}

export function UnifiedPatientDashboard({
  patientId,
  patientName,
  patient,
  token,
  isDoctor,
  currentDoctorId,
  onPatientUpdate,
}: UnifiedPatientDashboardProps) {
  const [activeTab, setActiveTab] = useState("teeth")

  return (
    <Card className="overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/50">
          <TabsTrigger value="teeth" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Tooth Chart</span>
            <span className="sm:hidden">Teeth</span>
          </TabsTrigger>
          
          <TabsTrigger value="medical-history" className="flex items-center gap-2 data-[state=active]:bg-background">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Medical History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          
          <TabsTrigger value="images" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">Images</span>
            <span className="sm:hidden">Images</span>
          </TabsTrigger>
        </TabsList>

        <div className="p-4 md:p-6">
          {/* Tooth Chart Tab */}
          <TabsContent value="teeth" className="mt-0 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Dental Chart</h3>
              <ToothChart
                patientId={patientId}
                token={token}
                onSave={() => {
                  onPatientUpdate?.()
                  toast.success("Tooth chart updated")
                }}
              />
            </div>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical-history" className="mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Medical History</h3>
                <MedicalHistorySection
                  patientId={patientId}
                  token={token}
                  isDoctor={isDoctor}
                  currentDoctorId={currentDoctorId}
                />
              </div>
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">X-rays & Images</h3>
                <PatientImagesSection patientId={patientId} token={token} isDoctor={isDoctor} />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
