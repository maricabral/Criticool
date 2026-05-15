using System.ComponentModel.DataAnnotations;

public class UserRatingRangeAttribute : ValidationAttribute
{
    public UserRatingRangeAttribute()
    {
        ErrorMessage = "The UserRating must be within the valid range: 0 to 10.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            // Property is marked as [Required], so null values are handled separately.
            return false;
        }

        if (value is short rating)
        {
            return rating >= 0 && rating <= 10;
        }

        return false;
    }
}
