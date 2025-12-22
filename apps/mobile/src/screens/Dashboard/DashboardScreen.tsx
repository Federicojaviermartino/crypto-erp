import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { RootState } from '../../store';
import { COLORS, CHART_COLORS } from '../../utils/constants';
import apiClient from '../../api/client';

/**
 * Dashboard Screen
 *
 * Features:
 * - Revenue chart (line chart)
 * - Invoice status distribution (pie chart)
 * - Monthly revenue comparison (bar chart)
 * - Quick stats cards
 * - Pull to refresh
 */

interface DashboardScreenProps {
  navigation: any;
}

interface DashboardData {
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  cryptoPortfolioValue: number;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  invoiceStatusChart: {
    labels: string[];
    data: number[];
  };
}

const screenWidth = Dimensions.get('window').width;

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/analytics/dashboard');
      setDashboardData(response);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.firstName}! 👋</Text>
        <Text style={styles.subtitle}>Here's your business overview</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={styles.statValue}>
            {formatCurrency(dashboardData?.totalRevenue || 0)}
          </Text>
          <Text style={styles.statChange}>+12% vs last month</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Invoices</Text>
          <Text style={styles.statValue}>{dashboardData?.pendingInvoices || 0}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Invoices', { status: 'PENDING' })}>
            <Text style={styles.statLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Overdue</Text>
          <Text style={[styles.statValue, styles.statValueDanger]}>
            {dashboardData?.overdueInvoices || 0}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Invoices', { status: 'OVERDUE' })}>
            <Text style={styles.statLink}>Review →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Crypto Portfolio</Text>
          <Text style={styles.statValue}>
            {formatCurrency(dashboardData?.cryptoPortfolioValue || 0)}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
            <Text style={styles.statLink}>View portfolio →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Revenue Chart */}
      {dashboardData?.revenueChart && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue Trend (Last 6 Months)</Text>
          <LineChart
            data={{
              labels: dashboardData.revenueChart.labels,
              datasets: [
                {
                  data: dashboardData.revenueChart.data,
                },
              ],
            }}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.primary,
              backgroundGradientFrom: COLORS.primary,
              backgroundGradientTo: COLORS.primaryDark,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#fff',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Invoice Status Distribution */}
      {dashboardData?.invoiceStatusChart && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Invoice Status Distribution</Text>
          <PieChart
            data={dashboardData.invoiceStatusChart.labels.map((label, index) => ({
              name: label,
              population: dashboardData.invoiceStatusChart.data[index],
              color: CHART_COLORS[index % CHART_COLORS.length],
              legendFontColor: COLORS.text,
              legendFontSize: 14,
            }))}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateInvoice')}
          >
            <Text style={styles.actionButtonText}>+ New Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Transactions')}
          >
            <Text style={styles.actionButtonText}>View Transactions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: (screenWidth - 36) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statValueDanger: {
    color: COLORS.error,
  },
  statChange: {
    fontSize: 12,
    color: COLORS.success,
  },
  statLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  chartContainer: {
    padding: 24,
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  actionsContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;
