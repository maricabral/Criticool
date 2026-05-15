using System.Globalization;
using static CritiCool.Data.Models.Constants.Date;

namespace CritiCool.Infrastructure.Extentions
{
    /// <summary>
    /// Provides extension methods for working with dates and date strings.
    /// </summary>
    public static class DateExtensions
    {
        private const string DefaultDateString = "1900-01-01";

        /// <summary>
        /// Gets the next day's date as a string, given an input date string.
        /// </summary>
        /// <param name="stringDate">The input date string in "yyyy-MM-dd" format.</param>
        /// <returns>The next day's date as a string in "yyyy-MM-dd" format.</returns>
        public static string GetNextStringDate(this string stringDate)
        {
            if (DateTime.TryParseExact(stringDate, TMDBDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime date))
            {
                DateTime nextDate = date.AddDays(1);
                return nextDate.ToString(TMDBDateFormat);
            }

            throw new ArgumentException("Invalid date format.", nameof(stringDate));
        }

        /// <summary>
        /// Gets the date after one month as a string, given an input date string.
        /// </summary>
        /// <param name="stringDate">The input date string in "yyyy-MM-dd" format.</param>
        /// <returns>The date after one month as a string in "yyyy-MM-dd" format.</returns>
        public static string GetNextStringDateByMonth(this string stringDate)
        {
            if (DateTime.TryParseExact(stringDate, TMDBDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime date))
            {
                DateTime nextDate = date.AddMonths(1);
                return nextDate.ToString(TMDBDateFormat);
            }

            throw new ArgumentException("Invalid date format.", nameof(stringDate));
        }

        /// <summary>
        /// Converts a nullable DateTime object to its string representation in "yyyy-MM-dd" format.
        /// If the input date is null, returns a default date value.
        /// </summary>
        /// <param name="date">A nullable DateTime object.</param>
        /// <returns>The date's string representation or the default date value.</returns>
        public static string ToReleaseString(this DateTime? date)
        {
            if (date.HasValue)
                return date.Value.ToString(TMDBDateFormat);

            return DefaultDateString;
        }
    }
}
