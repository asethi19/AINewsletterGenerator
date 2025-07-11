import { useState, useEffect } from "react";
import { Settings, Newspaper, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewsFeeder from "@/components/NewsFeeder";
import NewsletterGenerator from "@/components/NewsletterGenerator";
import ControlsPanel from "@/components/ControlsPanel";
import StatusPanel from "@/components/StatusPanel";
import SettingsModal from "@/components/SettingsModal";
import ScheduleManager from "@/components/ScheduleManager";
import SocialMediaManager from "@/components/SocialMediaManager";
import FeedSourceManager from "@/components/FeedSourceManager";
import DataManager from "@/components/DataManager";

export default function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
                  <Newspaper className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-800">AI Newsletter Automation Hub</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatDateTime(currentDateTime)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-600 hover:text-slate-800"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="feeds">Feed Sources</TabsTrigger>
            <TabsTrigger value="data">Data Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <NewsFeeder />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <NewsletterGenerator />
                <ControlsPanel />
              </div>
            </div>

            {/* Status Panel (Full Width) */}
            <div className="mt-8">
              <StatusPanel />
            </div>
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <NewsletterGenerator />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleManager />
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <SocialMediaManager />
          </TabsContent>

          <TabsContent value="articles" className="space-y-6">
            <NewsFeeder />
          </TabsContent>

          <TabsContent value="feeds" className="space-y-6">
            <FeedSourceManager />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
