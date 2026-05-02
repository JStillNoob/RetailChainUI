using System;
using BC = BCrypt.Net.BCrypt;
class Program { static void Main() { Console.WriteLine(BC.HashPassword("Admin@1234")); } }
