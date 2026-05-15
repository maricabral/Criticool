using CritiCool.Infrastructure.Extentions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace CritiCool.Tests.Extentions
{
    [TestClass]
    public class RandomNameGeneratorTests
    {
        [TestMethod]
        public void GenerateRandomFirstName_ReturnsNonEmptyString()
        {
            // Act
            string randomFirstName = RandomNameGenerator.GenerateRandomFirstName();

            // Assert
            Assert.IsFalse(string.IsNullOrEmpty(randomFirstName));
        }

        [TestMethod]
        public void GenerateRandomLastName_ReturnsNonEmptyString()
        {
            // Act
            string randomLastName = RandomNameGenerator.GenerateRandomLastName();

            // Assert
            Assert.IsFalse(string.IsNullOrEmpty(randomLastName));
        }

        [TestMethod]
        public void GenerateRandomName_ReturnsNonEmptyString()
        {
            // Act
            string randomName = RandomNameGenerator.GenerateRandomName();

            // Assert
            Assert.IsFalse(string.IsNullOrEmpty(randomName));
        }

        [TestMethod]
        public void GenerateRandomName_ReturnsTwoParts()
        {
            // Act
            string randomName = RandomNameGenerator.GenerateRandomName();
            string[] nameParts = randomName.Split(' ');

            // Assert
            Assert.AreEqual(2, nameParts.Length);
        }
    }
}
