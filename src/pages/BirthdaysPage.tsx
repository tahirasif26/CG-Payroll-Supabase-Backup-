import { PageHeader } from "@/components/PageHeader";
import { employees, getUpcomingBirthdays } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, PartyPopper, Cake } from "lucide-react";

export default function BirthdaysPage() {
  const birthdays = getUpcomingBirthdays(employees);

  return (
    <div className="space-y-6">
      <PageHeader title="Birthdays" description="Celebrate your team! Send birthday wishes and flyers." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {birthdays.map((emp) => {
          const isToday = emp.daysUntil === 0;
          const isSoon = emp.daysUntil <= 7 && emp.daysUntil > 0;

          return (
            <Card key={emp.id} className={`overflow-hidden transition-all hover:shadow-lg ${isToday ? "ring-2 ring-primary shadow-lg" : ""}`}>
              <div className={`h-2 w-full ${isToday ? "gradient-ey" : isSoon ? "bg-warning" : "bg-muted"}`} />
              <CardContent className="pt-5">
                <div className="text-center">
                  <div className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-3 ${isToday ? "gradient-ey" : "bg-secondary"}`}>
                    {isToday ? (
                      <PartyPopper className="h-7 w-7 text-primary-foreground" />
                    ) : (
                      <span className="text-lg font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    )}
                  </div>
                  <h3 className="font-semibold">{emp.firstName} {emp.lastName}</h3>
                  <p className="text-xs text-muted-foreground">{emp.department} · {emp.designation}</p>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(emp.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <p className={`text-xs font-medium mt-1 ${isToday ? "text-primary-foreground bg-primary rounded-full px-3 py-1 inline-block" : isSoon ? "text-warning" : "text-muted-foreground"}`}>
                    {isToday ? "🎉 Happy Birthday!" : `In ${emp.daysUntil} days`}
                  </p>
                  {(isToday || isSoon) && (
                    <button className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1 mx-auto">
                      <Gift className="h-3 w-3" /> Send Birthday Flyer
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
