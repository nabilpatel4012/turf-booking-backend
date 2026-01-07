import { AppDataSource } from "../db/data.source";
import { Booking } from "../entities/booking.entity";

export class AnalyticsService {
  private bookingRepo = AppDataSource.getRepository(Booking);

  // 1. Daily Revenue Trends (Last 90 days)
  async getDailyRevenue(ownerId: string, days: number = 90) {
    const query = `
      WITH daily_revenue AS (
        SELECT 
          DATE(b.created_at) as booking_date,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as revenue,
          AVG(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE NULL END) as avg_booking_value
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.created_at >= CURRENT_DATE - make_interval(days => $2)
        GROUP BY DATE(b.created_at)
      )
      SELECT 
        booking_date,
        total_bookings,
        completed_bookings,
        cancelled_bookings,
        ROUND(revenue::numeric, 2) as revenue,
        ROUND(avg_booking_value::numeric, 2) as avg_booking_value,
        ROUND((cancelled_bookings::float / NULLIF(total_bookings, 0) * 100)::numeric, 2) as cancellation_rate,
        ROUND(AVG(revenue) OVER (
          ORDER BY booking_date 
          ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        )::numeric, 2) as revenue_7d_ma
      FROM daily_revenue
      ORDER BY booking_date DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, days]);
  }

  // 2. Monthly Revenue with Growth Rate
  async getMonthlyRevenue(ownerId: string, months: number = 12) {
    const query = `
      WITH monthly_stats AS (
        SELECT 
          DATE_TRUNC('month', b.created_at) as month,
          COUNT(*) as bookings,
          SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as revenue,
          COUNT(DISTINCT b.user_id) as unique_customers,
          COUNT(DISTINCT b.turf_id) as unique_turfs
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.created_at >= CURRENT_DATE - make_interval(months => $2)
        GROUP BY DATE_TRUNC('month', b.created_at)
      )
      SELECT 
        month,
        bookings,
        ROUND(revenue::numeric, 2) as revenue,
        unique_customers,
        unique_turfs,
        ROUND((revenue / NULLIF(bookings, 0))::numeric, 2) as avg_revenue_per_booking,
        ROUND(((revenue - LAG(revenue) OVER (ORDER BY month)) / 
          NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100)::numeric, 2) as revenue_growth_pct,
        ROUND(((bookings - LAG(bookings) OVER (ORDER BY month))::float / 
          NULLIF(LAG(bookings) OVER (ORDER BY month), 0) * 100)::numeric, 2) as booking_growth_pct
      FROM monthly_stats
      ORDER BY month DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, months]);
  }

  // 3. Top Performing Turfs
  async getTopPerformingTurfs(ownerId: string, days: number = 30) {
    const query = `
      WITH turf_metrics AS (
        SELECT 
          b.turf_id,
          t.name as turf_name,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as total_revenue,
          AVG(CASE WHEN b.status = 'completed' THEN b.paid_amount END) as avg_booking_value,
          AVG(CASE WHEN b.status = 'completed' THEN r.rating END) as avg_rating,
          COUNT(DISTINCT r.id) as review_count,
          COUNT(DISTINCT b.date::text || EXTRACT(HOUR FROM b.start_time)::text) as occupied_slots
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        LEFT JOIN reviews r ON b.turf_id = r.turf_id
        WHERE t.owner_id = $1
          AND b.created_at >= CURRENT_DATE - make_interval(days => $2)
        GROUP BY b.turf_id, t.name
      )
      SELECT 
        turf_name,
        total_bookings,
        completed_bookings,
        ROUND(total_revenue::numeric, 2) as revenue,
        ROUND(avg_booking_value::numeric, 2) as avg_booking_value,
        ROUND(avg_rating::numeric, 2) as avg_rating,
        review_count,
        occupied_slots,
        ROUND((occupied_slots::float / ($2 * 12) * 100)::numeric, 2) as utilization_rate_pct,
        RANK() OVER (ORDER BY total_revenue DESC) as revenue_rank
      FROM turf_metrics
      ORDER BY total_revenue DESC
      LIMIT 20;
    `;
    return await this.bookingRepo.query(query, [ownerId, days]);
  }

  // 4. Peak Hours Analysis
  async getPeakHours(ownerId: string, days: number = 60) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM b.start_time) as hour_of_day,
        EXTRACT(DOW FROM b.date::date) as day_of_week,
        CASE EXTRACT(DOW FROM b.date::date)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        COUNT(*) as booking_count,
        SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as revenue,
        AVG(CASE WHEN b.status = 'completed' THEN b.paid_amount END) as avg_value
      FROM bookings b
      INNER JOIN turfs t ON b.turf_id = t.id
      WHERE t.owner_id = $1
        AND b.created_at >= CURRENT_DATE - make_interval(days => $2)
      GROUP BY EXTRACT(HOUR FROM b.start_time), EXTRACT(DOW FROM b.date::date)
      ORDER BY day_of_week, hour_of_day;
    `;
    return await this.bookingRepo.query(query, [ownerId, days]);
  }

  // 5. Customer Segmentation (RFM Analysis)
  async getCustomerSegmentation(ownerId: string) {
    const query = `
      WITH customer_stats AS (
        SELECT 
          b.user_id,
          MAX(b.created_at) as last_booking_date,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as total_spent,
          CURRENT_DATE - MAX(DATE(b.created_at)) as days_since_last_booking
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.status = 'completed'
        GROUP BY b.user_id
      ),
      rfm_scores AS (
        SELECT 
          user_id,
          total_bookings,
          total_spent,
          days_since_last_booking,
          NTILE(5) OVER (ORDER BY days_since_last_booking) as recency_score,
          NTILE(5) OVER (ORDER BY total_bookings DESC) as frequency_score,
          NTILE(5) OVER (ORDER BY total_spent DESC) as monetary_score
        FROM customer_stats
      )
      SELECT 
        CASE 
          WHEN recency_score >= 4 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'Champions'
          WHEN recency_score >= 3 AND frequency_score >= 3 THEN 'Loyal Customers'
          WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'Promising'
          WHEN recency_score <= 2 AND frequency_score >= 4 THEN 'At Risk'
          WHEN recency_score <= 2 AND frequency_score <= 2 THEN 'Hibernating'
          WHEN monetary_score >= 4 AND frequency_score <= 2 THEN 'Big Spenders'
          ELSE 'Regular'
        END as customer_segment,
        COUNT(*) as customer_count,
        ROUND(AVG(total_spent)::numeric, 2) as avg_total_spent,
        ROUND(AVG(total_bookings)::numeric, 2) as avg_bookings,
        ROUND(AVG(days_since_last_booking)::numeric, 1) as avg_days_since_last_booking
      FROM rfm_scores
      GROUP BY customer_segment
      ORDER BY customer_count DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId]);
  }

  // 6. Customer Cohort Analysis
  async getCustomerCohorts(ownerId: string, months: number = 12) {
    const query = `
      WITH first_booking AS (
        SELECT 
          b.user_id,
          DATE_TRUNC('month', MIN(b.created_at)) as cohort_month
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.status = 'completed'
        GROUP BY b.user_id
      ),
      cohort_activity AS (
        SELECT 
          fb.cohort_month,
          DATE_TRUNC('month', b.created_at) as activity_month,
          COUNT(DISTINCT b.user_id) as active_users,
          SUM(b.paid_amount) as revenue
        FROM first_booking fb
        JOIN bookings b ON fb.user_id = b.user_id AND b.status = 'completed'
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
        GROUP BY fb.cohort_month, DATE_TRUNC('month', b.created_at)
      ),
      cohort_size AS (
        SELECT 
          cohort_month,
          COUNT(DISTINCT user_id) as cohort_size
        FROM first_booking
        GROUP BY cohort_month
      )
      SELECT 
        ca.cohort_month,
        cs.cohort_size,
        ca.activity_month,
        EXTRACT(MONTH FROM AGE(ca.activity_month, ca.cohort_month)) as months_since_first,
        ca.active_users,
        ROUND((ca.active_users::float / cs.cohort_size * 100)::numeric, 2) as retention_rate,
        ROUND(ca.revenue::numeric, 2) as cohort_revenue
      FROM cohort_activity ca
      JOIN cohort_size cs ON ca.cohort_month = cs.cohort_month
      WHERE ca.cohort_month >= CURRENT_DATE - make_interval(months => $2)
      ORDER BY ca.cohort_month, months_since_first;
    `;
    return await this.bookingRepo.query(query, [ownerId, months]);
  }

  // 7. Cancellation Analysis
  async getCancellationAnalytics(ownerId: string, weeks: number = 12) {
    const query = `
      WITH cancellation_stats AS (
        SELECT 
          DATE_TRUNC('week', b.created_at) as week,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          AVG(CASE WHEN b.status = 'cancelled' 
            THEN EXTRACT(EPOCH FROM (b.cancelled_at - b.created_at))/3600 
            END) as avg_hours_to_cancel
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.created_at >= CURRENT_DATE - make_interval(weeks => $2)
        GROUP BY DATE_TRUNC('week', b.created_at)
      )
      SELECT 
        week,
        total_bookings,
        cancelled_bookings,
        ROUND((cancelled_bookings::float / NULLIF(total_bookings, 0) * 100)::numeric, 2) as cancellation_rate,
        ROUND(avg_hours_to_cancel::numeric, 1) as avg_hours_to_cancel,
        ROUND(AVG(cancelled_bookings::float / NULLIF(total_bookings, 0) * 100) OVER (
          ORDER BY week 
          ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        )::numeric, 2) as cancellation_rate_4w_ma
      FROM cancellation_stats
      ORDER BY week DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, weeks]);
  }

  // 8. Top Cancellation Reasons
  async getTopCancellationReasons(ownerId: string, days: number = 90) {
    const query = `
      SELECT 
        b.cancellation_reason,
        COUNT(*) as count,
        ROUND((COUNT(*)::float / (
          SELECT COUNT(*) FROM bookings b2 
          INNER JOIN turfs t2 ON b2.turf_id = t2.id 
          WHERE t2.owner_id = $1 AND b2.status = 'cancelled' AND b2.created_at >= CURRENT_DATE - make_interval(days => $2)
        ) * 100)::numeric, 2) as percentage,
        AVG(EXTRACT(EPOCH FROM (b.cancelled_at - b.created_at))/3600) as avg_hours_to_cancel
      FROM bookings b
      INNER JOIN turfs t ON b.turf_id = t.id
      WHERE t.owner_id = $1
        AND b.status = 'cancelled' 
        AND b.cancellation_reason IS NOT NULL
        AND b.created_at >= CURRENT_DATE - make_interval(days => $2)
      GROUP BY b.cancellation_reason
      ORDER BY count DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, days]);
  }

  // 9. Rating Distribution and Trends
  async getRatingTrends(ownerId: string, months: number = 6) {
    const query = `
      WITH rating_stats AS (
        SELECT 
          DATE_TRUNC('month', r.created_at) as month,
          r.turf_id,
          t.name as turf_name,
          r.rating,
          COUNT(*) as rating_count
        FROM reviews r
        JOIN turfs t ON r.turf_id = t.id
        WHERE t.owner_id = $1
          AND r.created_at >= CURRENT_DATE - make_interval(months => $2)
        GROUP BY DATE_TRUNC('month', r.created_at), r.turf_id, t.name, r.rating
      )
      SELECT 
        month,
        turf_name,
        SUM(rating_count) as total_reviews,
        ROUND((SUM(rating * rating_count)::float / NULLIF(SUM(rating_count), 0))::numeric, 2) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN rating_count ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN rating_count ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN rating_count ELSE 0 END) as three_star,
        SUM(CASE WHEN rating <= 2 THEN rating_count ELSE 0 END) as low_rating,
        ROUND(((
          (SUM(CASE WHEN rating = 5 THEN rating_count ELSE 0 END)::float / NULLIF(SUM(rating_count), 0)) -
          (SUM(CASE WHEN rating <= 3 THEN rating_count ELSE 0 END)::float / NULLIF(SUM(rating_count), 0))
        ) * 100)::numeric, 2) as nps_score
      FROM rating_stats
      GROUP BY month, turf_name
      ORDER BY month DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, months]);
  }

  // 10. Booking Forecast
  async getBookingForecast(ownerId: string, weeks: number = 26) {
    const query = `
      WITH weekly_bookings AS (
        SELECT 
          DATE_TRUNC('week', b.created_at) as week,
          ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('week', b.created_at)) as week_number,
          COUNT(*) as booking_count,
          SUM(CASE WHEN b.status = 'completed' THEN b.paid_amount ELSE 0 END) as revenue
        FROM bookings b
        INNER JOIN turfs t ON b.turf_id = t.id
        WHERE t.owner_id = $1
          AND b.created_at >= CURRENT_DATE - make_interval(weeks => $2)
        GROUP BY DATE_TRUNC('week', b.created_at)
      ),
      trend_stats AS (
        SELECT 
          AVG(week_number) as avg_x,
          AVG(booking_count) as avg_y,
          AVG(revenue) as avg_revenue
        FROM weekly_bookings
      ),
      regression AS (
        SELECT 
          SUM((week_number - ts.avg_x) * (booking_count - ts.avg_y)) / 
            NULLIF(SUM(POWER(week_number - ts.avg_x, 2)), 0) as slope_bookings,
          SUM((week_number - ts.avg_x) * (revenue - ts.avg_revenue)) / 
            NULLIF(SUM(POWER(week_number - ts.avg_x, 2)), 0) as slope_revenue,
          ts.avg_y - (SUM((week_number - ts.avg_x) * (booking_count - ts.avg_y)) / 
            NULLIF(SUM(POWER(week_number - ts.avg_x, 2)), 0)) * ts.avg_x as intercept_bookings
        FROM weekly_bookings
        CROSS JOIN trend_stats ts
        GROUP BY ts.avg_x, ts.avg_y, ts.avg_revenue
      )
      SELECT 
        wb.week,
        wb.booking_count as actual_bookings,
        ROUND(wb.revenue::numeric, 2) as actual_revenue,
        ROUND((r.intercept_bookings + r.slope_bookings * wb.week_number)::numeric, 0) as predicted_bookings,
        ROUND((wb.booking_count - (r.intercept_bookings + r.slope_bookings * wb.week_number))::numeric, 0) as residual,
        CASE 
          WHEN wb.week = MAX(wb.week) OVER () THEN 
            ROUND((r.intercept_bookings + r.slope_bookings * (wb.week_number + 1))::numeric, 0)
        END as next_week_forecast
      FROM weekly_bookings wb
      CROSS JOIN regression r
      ORDER BY wb.week DESC;
    `;
    return await this.bookingRepo.query(query, [ownerId, weeks]);
  }

  // 11. Operational KPIs Dashboard
  async getOperationalKPIs(ownerId: string) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days') as bookings_l30d,
        COUNT(*) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '60 days' 
          AND b.created_at < CURRENT_DATE - INTERVAL '30 days') as bookings_prev_30d,
        
        ROUND(SUM(b.paid_amount) FILTER (WHERE b.status = 'completed' 
          AND b.created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric, 2) as revenue_l30d,
        ROUND(SUM(b.paid_amount) FILTER (WHERE b.status = 'completed' 
          AND b.created_at >= CURRENT_DATE - INTERVAL '60 days'
          AND b.created_at < CURRENT_DATE - INTERVAL '30 days')::numeric, 2) as revenue_prev_30d,
        
        COUNT(DISTINCT b.user_id) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days') as active_customers_l30d,
        COUNT(DISTINCT b.user_id) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '60 days'
          AND b.created_at < CURRENT_DATE - INTERVAL '30 days') as active_customers_prev_30d,
        
        ROUND((COUNT(*) FILTER (WHERE b.status = 'completed' 
          AND b.created_at >= CURRENT_DATE - INTERVAL '30 days')::float / 
          NULLIF(COUNT(*) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) * 100)::numeric, 2) 
          as completion_rate_l30d,
        
        ROUND((COUNT(*) FILTER (WHERE b.status = 'cancelled' 
          AND b.created_at >= CURRENT_DATE - INTERVAL '30 days')::float / 
          NULLIF(COUNT(*) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) * 100)::numeric, 2) 
          as cancellation_rate_l30d,
        
        ROUND(AVG(b.paid_amount) FILTER (WHERE b.status = 'completed' 
          AND b.created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric, 2) as avg_booking_value_l30d
        
      FROM bookings b
      INNER JOIN turfs t ON b.turf_id = t.id
      WHERE t.owner_id = $1;
    `;
    return await this.bookingRepo.query(query, [ownerId]);
  }
}
