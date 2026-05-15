namespace CritiCool.Infrastructure.Extentions
{
    public static class RandomNameGenerator
    {
        private static Random random = new();

        public static string GenerateRandomFirstName()
        {
            List<string> firstNameList =
            [
                "John", "Jane", "Michael", "Emily", "William", "Olivia", "James", "Sophia",
                "Robert", "Ava", "David", "Isabella", "Joseph", "Mia", "Charles", "Charlotte"
            ];            

            string firstName = firstNameList[random.Next(firstNameList.Count)];
            return firstName;
        }

        public static string GenerateRandomLastName()
        { 
            List<string> lastNameList =
            [
                "Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
                "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Lee"
            ];
           
            string lastName = lastNameList[random.Next(lastNameList.Count)];
            return lastName;
        }

        public static string GenerateRandomName()
        {           
            string firstName = GenerateRandomFirstName();
            string lastName = GenerateRandomLastName();

            return $"{firstName} {lastName}";
        }
    }
}
