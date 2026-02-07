"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock, User, FileText, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Appointment {
  _id?: string
  id?: string
  patientName: string
  doctorName: string
  date: string
  time: string
  type: string
  status: string
  duration?: number
  roomNumber?: string
  procedures?: string[]
}

interface AppointmentsCalendarViewProps {
  appointments: Appointment[]
  onAddAppointment?: () => void
  onViewAppointment?: (appointment: Appointment) => void
  isDoctor?: boolean
}

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8 // 8 AM to 4 PM
  const minute = (i % 2) * 30 // 0 or 30 minutes
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
})

export function AppointmentsCalendarView({
  appointments,
  onAddAppointment,
  onViewAppointment,
  isDoctor = false,
}: AppointmentsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const calendarDays = useMemo(() => {
    const days = []
    const totalDays = daysInMonth(currentDate)
    const firstDay = firstDayOfMonth(currentDate)

    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Days of month
    for (let i = 1; i <= totalDays; i++) {
      days.push(i)
    }

    return days
  }, [currentDate])

  const getAppointmentsForDay = (day: number) => {
    if (!day) return []

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    return appointments.filter((apt) => apt.date === dateStr)
  }

  const getTimeSlotAppointments = (day: number, timeSlot: string) => {
    return getAppointmentsForDay(day).filter((apt) => apt.time === timeSlot)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" })

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center py-2 font-medium text-sm text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const dayAppointments = day ? getAppointmentsForDay(day) : []
            const isToday =
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear()

            return (
              <div
                key={idx}
                className={`min-h-24 p-2 rounded border transition-colors cursor-pointer ${
                  !day
                    ? "bg-muted"
                    : isToday
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                }`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium text-foreground mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((apt, i) => (
                        <div
                          key={i}
                          onClick={() => onViewAppointment?.(apt)}
                          className="text-xs bg-primary/10 text-primary p-1 rounded truncate hover:bg-primary/20 transition-colors"
                        >
                          {apt.time} - {apt.patientName.split(" ")[0]}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">+{dayAppointments.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Time Slots View */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Time Slots - {monthName}</h3>
          {onAddAppointment && (
            <button
              onClick={onAddAppointment}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Appointment
            </button>
          )}
        </div>

        {/* Time Slots Grid */}
        <div className="overflow-x-auto">
          <div className="space-y-2 min-w-max">
            {TIME_SLOTS.map((timeSlot) => {
              const slotAppointments = appointments.filter((apt) => apt.time === timeSlot)

              return (
                <div key={timeSlot} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground min-w-16">{timeSlot}</span>
                    <span className="text-xs text-muted-foreground">
                      ({slotAppointments.length} appointment{slotAppointments.length !== 1 ? "s" : ""})
                    </span>
                  </div>

                  {slotAppointments.length === 0 ? (
                    <div className="text-xs text-muted-foreground ml-7 py-1">No appointments</div>
                  ) : (
                    <div className="ml-7 space-y-2">
                      {slotAppointments.map((apt) => (
                        <div
                          key={apt._id || apt.id}
                          onClick={() => onViewAppointment?.(apt)}
                          className="bg-card border border-border p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <p className="font-medium text-sm text-foreground truncate">{apt.patientName}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <FileText className="w-3 h-3 flex-shrink-0" />
                                <span>{apt.type}</span>
                                {apt.roomNumber && <span>• Room {apt.roomNumber}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Doctor: {apt.doctorName}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
                                apt.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : apt.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : apt.status === "completed"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
