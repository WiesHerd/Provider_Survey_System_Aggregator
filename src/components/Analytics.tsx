import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Download, BarChart3, LineChart, PieChart } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { useAnalytics } from '../hooks/useAnalytics';
import { useSurveyData } from '../hooks/useSurveyData';
import { RegionalComparison } from '../features/regional';
import { AnalysisProgressBar } from '../shared/components/AnalysisProgressBar';

const Analytics: React.FC = () => {
  const { data: analyticsData } = useAnalytics();
  const { loading, error } = useSurveyData();
  const { toast } = useToast();

  if (loading) {
    return (
      <AnalysisProgressBar
        message="Loading analytics data..."
        progress={39.90}
        recordCount={0}
      />
    );
  }

  if (error) {
    return <div>Error loading analytics data: {error}</div>;
  }

  if (!analyticsData) {
    return <div>No analytics data available</div>;
  }

  const { nationalMetrics, regionalMetrics } = analyticsData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-4">
          <Select defaultValue="cardiovascular-surgery">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cardiovascular-surgery">Cardiovascular Surgery</SelectItem>
              {/* Add more specialties as needed */}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="rounded-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Regional Comparison */}
          <div className="col-span-4">
            <Card className="rounded-xl shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>Regional Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <RegionalComparison 
                  data={[
                    {
                      region: 'National',
                      tcc_p25: nationalMetrics.tcc_p25,
                      tcc_p50: nationalMetrics.tcc_p50,
                      tcc_p75: nationalMetrics.tcc_p75,
                      tcc_p90: nationalMetrics.tcc_p90,
                      cf_p25: nationalMetrics.cf_p25,
                      cf_p50: nationalMetrics.cf_p50,
                      cf_p75: nationalMetrics.cf_p75,
                      cf_p90: nationalMetrics.cf_p90,
                      wrvus_p25: nationalMetrics.wrvus_p25,
                      wrvus_p50: nationalMetrics.wrvus_p50,
                      wrvus_p75: nationalMetrics.wrvus_p75,
                      wrvus_p90: nationalMetrics.wrvus_p90,
                    },
                    {
                      region: 'Northeast',
                      tcc_p25: regionalMetrics.Northeast.tcc_p25,
                      tcc_p50: regionalMetrics.Northeast.tcc_p50,
                      tcc_p75: regionalMetrics.Northeast.tcc_p75,
                      tcc_p90: regionalMetrics.Northeast.tcc_p90,
                      cf_p25: regionalMetrics.Northeast.cf_p25,
                      cf_p50: regionalMetrics.Northeast.cf_p50,
                      cf_p75: regionalMetrics.Northeast.cf_p75,
                      cf_p90: regionalMetrics.Northeast.cf_p90,
                      wrvus_p25: regionalMetrics.Northeast.wrvus_p25,
                      wrvus_p50: regionalMetrics.Northeast.wrvus_p50,
                      wrvus_p75: regionalMetrics.Northeast.wrvus_p75,
                      wrvus_p90: regionalMetrics.Northeast.wrvus_p90,
                    },
                    {
                      region: 'North Central',
                      tcc_p25: regionalMetrics['North Central'].tcc_p25,
                      tcc_p50: regionalMetrics['North Central'].tcc_p50,
                      tcc_p75: regionalMetrics['North Central'].tcc_p75,
                      tcc_p90: regionalMetrics['North Central'].tcc_p90,
                      cf_p25: regionalMetrics['North Central'].cf_p25,
                      cf_p50: regionalMetrics['North Central'].cf_p50,
                      cf_p75: regionalMetrics['North Central'].cf_p75,
                      cf_p90: regionalMetrics['North Central'].cf_p90,
                      wrvus_p25: regionalMetrics['North Central'].wrvus_p25,
                      wrvus_p50: regionalMetrics['North Central'].wrvus_p50,
                      wrvus_p75: regionalMetrics['North Central'].wrvus_p75,
                      wrvus_p90: regionalMetrics['North Central'].wrvus_p90,
                    },
                    {
                      region: 'South',
                      tcc_p25: regionalMetrics.South.tcc_p25,
                      tcc_p50: regionalMetrics.South.tcc_p50,
                      tcc_p75: regionalMetrics.South.tcc_p75,
                      tcc_p90: regionalMetrics.South.tcc_p90,
                      cf_p25: regionalMetrics.South.cf_p25,
                      cf_p50: regionalMetrics.South.cf_p50,
                      cf_p75: regionalMetrics.South.cf_p75,
                      cf_p90: regionalMetrics.South.cf_p90,
                      wrvus_p25: regionalMetrics.South.wrvus_p25,
                      wrvus_p50: regionalMetrics.South.wrvus_p50,
                      wrvus_p75: regionalMetrics.South.wrvus_p75,
                      wrvus_p90: regionalMetrics.South.wrvus_p90,
                    },
                    {
                      region: 'West',
                      tcc_p25: regionalMetrics.West.tcc_p25,
                      tcc_p50: regionalMetrics.West.tcc_p50,
                      tcc_p75: regionalMetrics.West.tcc_p75,
                      tcc_p90: regionalMetrics.West.tcc_p90,
                      cf_p25: regionalMetrics.West.cf_p25,
                      cf_p50: regionalMetrics.West.cf_p50,
                      cf_p75: regionalMetrics.West.cf_p75,
                      cf_p90: regionalMetrics.West.cf_p90,
                      wrvus_p25: regionalMetrics.West.wrvus_p25,
                      wrvus_p50: regionalMetrics.West.wrvus_p50,
                      wrvus_p75: regionalMetrics.West.wrvus_p75,
                      wrvus_p90: regionalMetrics.West.wrvus_p90,
                    }
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          {/* Add trends content */}
        </TabsContent>

        <TabsContent value="comparison">
          {/* Add comparison content */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics; 